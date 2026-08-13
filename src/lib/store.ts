"use client";

import { create } from "zustand";
import { AppNotification, CalendarEvent, Profile, Task } from "./types";
import { newId } from "./utils";
import { isSupabaseConfigured, supabase } from "./supabase/client";
import * as db from "./db";

export type AuthStatus = "checking" | "signed_out" | "signed_in";

export const backendConfigured = isSupabaseConfigured;

const emptyNotificationPrefs = { deadlines: true, scheduleGaps: true, dailyBriefing: true };

interface AlxioumState {
  hydrated: boolean;
  profile: Profile | null;
  tasks: Task[];
  events: CalendarEvent[];
  notifications: AppNotification[];
  commandOpen: boolean;

  authStatus: AuthStatus;
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  authBusy: boolean;
  dataLoading: boolean;

  setCommandOpen: (open: boolean) => void;

  initAuth: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<"signed_in" | "check_code" | "already_registered" | "error">;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  verifySignupCode: (email: string, code: string) => Promise<boolean>;
  resendSignupCode: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;

  refreshAll: () => Promise<void>;

  toggleTask: (id: string) => void;
  addTask: (task: Partial<Task> & { title: string }) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addEvent: (event: Omit<CalendarEvent, "id" | "movable" | "timezone" | "recurrence"> & Partial<Pick<CalendarEvent, "movable" | "timezone" | "recurrence">>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;

  markNotificationRead: (id: string) => void;

  updateProfile: (patch: Partial<Profile>) => void;
}

function reportSyncError(context: string, err: unknown) {
  console.error(`[Alxioum sync] ${context} failed:`, err);
}

export const useAlxioum = create<AlxioumState>((set, get) => {
  function synced(): string | null {
    const s = get();
    return backendConfigured && s.authStatus === "signed_in" ? s.authUserId : null;
  }

  async function loadUserData(userId: string, email: string) {
    set({ dataLoading: true, authError: null });
    try {
      const [profile, tasks, events, notifications] = await Promise.all([
        db.fetchProfile(userId),
        db.fetchTasks(userId),
        db.fetchEvents(userId),
        db.fetchNotifications(userId),
      ]);
      set({
        profile:
          profile ?? {
            name: email.split("@")[0] || "You",
            email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            location: "",
            avatarInitials: (email[0] ?? "U").toUpperCase(),
            plan: "Free",
            theme: "system",
            memoryEnabled: true,
            notificationPrefs: emptyNotificationPrefs,
            onboarded: false,
            aiMessagesUsed: 0,
            aiTokensUsed: 0,
            usagePeriodStart: new Date().toISOString().slice(0, 10),
          },
        tasks,
        events,
        notifications,
        dataLoading: false,
        hydrated: true,
      });
    } catch (err) {
      reportSyncError("load account data", err);
      set({ dataLoading: false, authError: err instanceof Error ? err.message : "Couldn't load your data." });
    }
  }

  return {
    hydrated: false,
    profile: null,
    tasks: [],
    events: [],
    notifications: [],
    commandOpen: false,

    authStatus: backendConfigured ? "checking" : "signed_out",
    authUserId: null,
    authEmail: null,
    authError: null,
    authBusy: false,
    dataLoading: false,

    setCommandOpen: (open) => set({ commandOpen: open }),

    initAuth: async () => {
      if (!backendConfigured || !supabase) {
        set({ authStatus: "signed_out" });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        set({ authStatus: "signed_in", authUserId: session.user.id, authEmail: session.user.email ?? "" });
        await loadUserData(session.user.id, session.user.email ?? "");
      } else {
        set({ authStatus: "signed_out" });
      }

      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === "SIGNED_OUT") {
          set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false, profile: null, tasks: [], events: [], notifications: [] });
        } else if (event === "SIGNED_IN" && newSession) {
          set({ authStatus: "signed_in", authUserId: newSession.user.id, authEmail: newSession.user.email ?? "" });
        }
      });
    },

    getAccessToken: async () => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    },

    refreshAll: async () => {
      const userId = get().authUserId;
      const email = get().authEmail ?? "";
      if (!userId) return;
      await loadUserData(userId, email);
    },

    signUp: async (email, password, name) => {
      if (!supabase) return "error";
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) {
        set({ authBusy: false, authError: error.message });
        return "error";
      }
      if (data.session) {
        // Email confirmation is off on this project, or this account was
        // already confirmed and Supabase logged them straight in.
        set({ authStatus: "signed_in", authUserId: data.session.user.id, authEmail: data.session.user.email ?? email });
        await loadUserData(data.session.user.id, data.session.user.email ?? email);
        if (name.trim()) db.updateProfileRow(data.session.user.id, { name: name.trim() }).catch(() => {});
        set({ authBusy: false });
        return "signed_in";
      }
      set({ authBusy: false });
      // Supabase returns a user with an empty identities array (no error,
      // to avoid leaking which emails are registered) when this email
      // already has an account — no new confirmation email gets sent in
      // that case, so telling the user to "check their email" would be a
      // lie. Surface the real state instead.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        set({ authError: "This email already has an account. Sign in instead, or use \"Forgot password\" if you don't remember it." });
        return "already_registered";
      }
      return "check_code";
    },

    signIn: async (email, password) => {
      if (!supabase) return;
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ authBusy: false, authError: error.message });
        return;
      }
      set({ authStatus: "signed_in", authUserId: data.user.id, authEmail: data.user.email ?? email });
      await loadUserData(data.user.id, data.user.email ?? email);
      set({ authBusy: false });
    },

    signInWithGoogle: async () => {
      if (!supabase) return;
      set({ authError: null });
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/app/today` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      // On success the browser navigates away to Google immediately; there's
      // no further local state to set here. Only a synchronous failure
      // (e.g. provider not configured) reports back before that happens.
      if (error) set({ authError: error.message });
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false, profile: null, tasks: [], events: [], notifications: [] });
    },

    verifySignupCode: async (email, code) => {
      if (!supabase) return false;
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
      if (error || !data.session) {
        set({ authBusy: false, authError: error?.message ?? "That code didn't work. Check it and try again." });
        return false;
      }
      set({ authStatus: "signed_in", authUserId: data.session.user.id, authEmail: data.session.user.email ?? email });
      await loadUserData(data.session.user.id, data.session.user.email ?? email);
      set({ authBusy: false });
      return true;
    },

    resendSignupCode: async (email) => {
      if (!supabase) return false;
      set({ authBusy: true, authError: null });
      const { error } = await supabase.auth.resend({ type: "signup", email });
      set({ authBusy: false, authError: error ? error.message : null });
      return !error;
    },

    forgotPassword: async (email) => {
      if (!supabase) return false;
      set({ authBusy: true, authError: null });
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      set({ authBusy: false, authError: error ? error.message : null });
      return !error;
    },

    updatePassword: async (newPassword) => {
      if (!supabase) return false;
      set({ authBusy: true, authError: null });
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      set({ authBusy: false, authError: error ? error.message : null });
      return !error;
    },

    toggleTask: (id) => {
      const existing = get().tasks.find((t) => t.id === id);
      if (!existing) return;
      const done = !existing.done;
      const completedAt = done ? new Date().toISOString() : undefined;
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done, completedAt } : t)) }));
      if (synced()) db.updateTaskRow(id, { done, completedAt }).catch((e) => reportSyncError("toggle task", e));
    },

    addTask: async (task) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertTask(userId, task);
        set((s) => ({ tasks: [created, ...s.tasks] }));
        return created;
      } catch (e) {
        reportSyncError("add task", e);
        return null;
      }
    },

    updateTask: (id, patch) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      if (synced()) db.updateTaskRow(id, patch).catch((e) => reportSyncError("update task", e));
    },

    deleteTask: (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      if (synced()) db.deleteTaskRow(id).catch((e) => reportSyncError("delete task", e));
    },

    addEvent: async (event) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertEvent(userId, { ...event, timezone: event.timezone ?? get().profile?.timezone ?? "UTC" });
        set((s) => ({ events: [...s.events, created].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)) }));
        return created;
      } catch (e) {
        reportSyncError("add event", e);
        return null;
      }
    },

    updateEvent: (id, patch) => {
      set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      if (synced()) db.updateEventRow(id, patch).catch((e) => reportSyncError("update event", e));
    },

    removeEvent: (id) => {
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      if (synced()) db.deleteEventRow(id).catch((e) => reportSyncError("delete event", e));
    },

    markNotificationRead: (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      if (synced()) db.markNotificationReadRow(id).catch((e) => reportSyncError("mark notification read", e));
    },

    updateProfile: (patch) => {
      set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : s.profile }));
      const userId = synced();
      if (userId) db.updateProfileRow(userId, patch).catch((e) => reportSyncError("update profile", e));
    },
  };
});

export { newId };
