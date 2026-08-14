"use client";

import { create } from "zustand";
import { AppNotification, CalendarEvent, FocusSession, Profile, StudentProfile, Subject, Task } from "./types";
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
  subjects: Subject[];
  focusSessions: FocusSession[];
  studentProfile: StudentProfile | null;
  commandOpen: boolean;

  authStatus: AuthStatus;
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  authBusy: boolean;
  dataLoading: boolean;

  setCommandOpen: (open: boolean) => void;

  initAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;

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

  addSubject: (subject: { name: string; color: string; icon: string }) => Promise<Subject | null>;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  startFocusSession: (session: { subjectId?: string; plannedMinutes: number }) => Promise<FocusSession | null>;
  completeFocusSession: (id: string, actualMinutes: number) => void;

  updateStudentProfile: (patch: Partial<StudentProfile>) => Promise<void>;
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
      const [profile, tasks, events, notifications, subjects, focusSessions, studentProfile] = await Promise.all([
        db.fetchProfile(userId),
        db.fetchTasks(userId),
        db.fetchEvents(userId),
        db.fetchNotifications(userId),
        db.fetchSubjects(userId),
        db.fetchFocusSessions(userId),
        db.fetchStudentProfile(userId),
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
        subjects,
        focusSessions,
        studentProfile,
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
    subjects: [],
    focusSessions: [],
    studentProfile: null,
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
          set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false, profile: null, tasks: [], events: [], notifications: [], subjects: [], focusSessions: [], studentProfile: null });
          return;
        }
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && newSession) {
          // Fires after the OAuth (Google) redirect completes, and can also
          // re-fire for a session we already loaded via getSession() above —
          // only (re)load account data if this is actually a new sign-in.
          const current = get();
          if (current.authUserId === newSession.user.id && current.hydrated) return;
          set({ authStatus: "signed_in", authUserId: newSession.user.id, authEmail: newSession.user.email ?? "" });
          loadUserData(newSession.user.id, newSession.user.email ?? "");
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
      set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false, profile: null, tasks: [], events: [], notifications: [], subjects: [], focusSessions: [], studentProfile: null });
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

    addSubject: async (subject) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertSubject(userId, subject);
        set((s) => ({ subjects: [...s.subjects, created] }));
        return created;
      } catch (e) {
        reportSyncError("add subject", e);
        return null;
      }
    },

    updateSubject: (id, patch) => {
      set((s) => ({ subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)) }));
      if (synced()) db.updateSubjectRow(id, patch).catch((e) => reportSyncError("update subject", e));
    },

    deleteSubject: (id) => {
      set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }));
      if (synced()) db.deleteSubjectRow(id).catch((e) => reportSyncError("delete subject", e));
    },

    startFocusSession: async (session) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertFocusSession(userId, session);
        set((s) => ({ focusSessions: [created, ...s.focusSessions] }));
        return created;
      } catch (e) {
        reportSyncError("start focus session", e);
        return null;
      }
    },

    completeFocusSession: (id, actualMinutes) => {
      const completedAt = new Date().toISOString();
      set((s) => ({ focusSessions: s.focusSessions.map((f) => (f.id === id ? { ...f, actualMinutes, completedAt } : f)) }));
      if (synced()) db.updateFocusSessionRow(id, { actualMinutes, completedAt }).catch((e) => reportSyncError("complete focus session", e));
    },

    updateStudentProfile: async (patch) => {
      const userId = synced();
      set((s) => ({ studentProfile: { ...(s.studentProfile ?? { schoolName: "", country: "", educationLevel: "" }), ...patch } }));
      if (!userId) return;
      try {
        const saved = await db.upsertStudentProfile(userId, patch);
        set({ studentProfile: saved });
      } catch (e) {
        reportSyncError("update student profile", e);
      }
    },
  };
});

export { newId };
