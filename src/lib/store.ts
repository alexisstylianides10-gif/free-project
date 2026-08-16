"use client";

import { create } from "zustand";
import {
  AppNotification,
  CalendarEvent,
  Document,
  DocumentCollection,
  DocumentDate,
  DocumentTask,
  FocusSession,
  Goal,
  GoalAction,
  GoalActionLog,
  GoalMilestone,
  Business,
  BusinessMilestone,
  BusinessMetricEntry,
  BusinessExperiment,
  BusinessCustomer,
  BusinessFeedback,
  BusinessInsight,
  BusinessMission,
  BusinessContentIdea,
  BusinessCompetitor,
  Profile,
  Routine,
  RoutineStep,
  ShoppingItem,
  ShoppingList,
  StudentProfile,
  Subject,
  Task,
} from "./types";
import { newId } from "./utils";
import { isSupabaseConfigured, supabase } from "./supabase/client";
import * as db from "./db";
import { pushEventToGoogleClient } from "./googleCalendarClient";
import { SEED_MILESTONES } from "./business/journeyStages";

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
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
  goals: Goal[];
  goalMilestones: GoalMilestone[];
  goalActions: GoalAction[];
  goalActionLogs: GoalActionLog[];
  businesses: Business[];
  businessMilestones: BusinessMilestone[];
  businessMetrics: BusinessMetricEntry[];
  businessExperiments: BusinessExperiment[];
  businessCustomers: BusinessCustomer[];
  businessFeedback: BusinessFeedback[];
  businessInsights: BusinessInsight[];
  businessMissions: BusinessMission[];
  businessContent: BusinessContentIdea[];
  businessCompetitors: BusinessCompetitor[];
  routines: Routine[];
  routineSteps: RoutineStep[];
  documents: Document[];
  documentCollections: DocumentCollection[];
  documentDates: DocumentDate[];
  documentTasks: DocumentTask[];
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

  addEvent: (
    event: Omit<CalendarEvent, "id" | "movable" | "timezone" | "recurrence" | "source"> & Partial<Pick<CalendarEvent, "movable" | "timezone" | "recurrence">>
  ) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;

  markNotificationRead: (id: string) => void;

  updateProfile: (patch: Partial<Profile>) => void;

  addSubject: (subject: { name: string; color: string; icon: string }) => Promise<Subject | null>;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  startFocusSession: (session: { subjectId?: string; taskId?: string; plannedMinutes: number }) => Promise<FocusSession | null>;
  completeFocusSession: (id: string, actualMinutes: number) => void;

  updateStudentProfile: (patch: Partial<StudentProfile>) => Promise<void>;

  addShoppingList: (list: { name: string; kind?: ShoppingList["kind"] }) => Promise<ShoppingList | null>;
  deleteShoppingList: (id: string) => void;
  addShoppingItem: (item: { listId: string; name: string; quantity?: string; category?: string }) => Promise<ShoppingItem | null>;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;

  addGoal: (goal: db.NewGoalInput) => Promise<Goal | null>;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addMilestone: (milestone: { goalId: string; title: string; sortOrder?: number; description?: string; targetDate?: string; measurementTarget?: number }) => Promise<GoalMilestone | null>;
  toggleMilestone: (id: string) => void;
  addGoalAction: (action: { goalId: string; title: string; frequencyPerWeek?: number; durationMinutes?: number }) => Promise<GoalAction | null>;
  deleteGoalAction: (id: string) => void;
  toggleGoalActionLog: (goalActionId: string, logDate: string) => void;

  createBusinessGoal: (input: {
    name: string;
    ideaSummary?: string;
    problem?: string;
    solution?: string;
    targetCustomer?: string;
    valueProposition?: string;
    measurementTarget?: number;
    measurementUnit?: string;
    targetDate?: string;
    revenueModel?: Business["revenueModel"];
    price?: number;
    pricePeriod?: string;
    targetCustomerCount?: number;
  }) => Promise<Business | null>;
  updateBusiness: (id: string, patch: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  addBusinessMilestone: (m: { businessId: string; stage: BusinessMilestone["stage"]; title: string; description?: string; sortOrder?: number; targetDate?: string }) => Promise<BusinessMilestone | null>;
  toggleBusinessMilestone: (id: string) => void;
  addBusinessMetric: (m: {
    businessId: string;
    revenue?: number;
    expenses?: number;
    customers?: number;
    mrr?: number;
    orders?: number;
    conversionRate?: number;
    visitors?: number;
    leads?: number;
    trials?: number;
    note?: string;
  }) => Promise<BusinessMetricEntry | null>;
  addBusinessExperiment: (e: { businessId: string; question: string; hypothesis?: string; testDescription?: string }) => Promise<BusinessExperiment | null>;
  updateBusinessExperiment: (id: string, patch: Partial<BusinessExperiment>) => void;
  addBusinessCustomer: (c: { businessId: string; name: string; stage?: BusinessCustomer["stage"]; notes?: string }) => Promise<BusinessCustomer | null>;
  updateBusinessCustomer: (id: string, patch: Partial<BusinessCustomer>) => void;
  addBusinessFeedback: (f: { businessId: string; customerId?: string; kind: BusinessFeedback["kind"]; content: string }) => Promise<BusinessFeedback | null>;
  addBusinessInsight: (i: { businessId: string; kind: BusinessInsight["kind"]; title: string; rationale?: string; evidence?: string; suggestedAction?: string }) => Promise<BusinessInsight | null>;
  updateBusinessInsight: (id: string, patch: Partial<BusinessInsight>) => void;
  addBusinessMission: (m: { businessId: string; title: string; missionDate?: string; linkedTaskId?: string }) => Promise<BusinessMission | null>;
  updateBusinessMission: (id: string, patch: Partial<BusinessMission>) => void;
  addBusinessContent: (c: { businessId: string; idea: string; platform?: string }) => Promise<BusinessContentIdea | null>;
  updateBusinessContent: (id: string, patch: Partial<BusinessContentIdea>) => void;
  addBusinessCompetitor: (c: {
    businessId: string;
    name: string;
    product?: string;
    targetCustomer?: string;
    pricing?: string;
    strengths?: string;
    weaknesses?: string;
    positioning?: string;
    source?: BusinessCompetitor["source"];
  }) => Promise<BusinessCompetitor | null>;

  addRoutine: (routine: { name: string; frequency?: string }) => Promise<Routine | null>;
  deleteRoutine: (id: string) => void;
  addRoutineStep: (step: { routineId: string; title: string; timeLabel?: string; sortOrder?: number }) => Promise<RoutineStep | null>;
  toggleRoutineStep: (id: string) => void;
  deleteRoutineStep: (id: string) => void;
  moveRoutineStep: (id: string, direction: "up" | "down") => void;

  uploadDocument: (file: File) => Promise<{ document: Document | null; error?: string }>;
  openDocument: (id: string) => void;
  toggleStarDocument: (id: string) => void;
  setDocumentCategory: (id: string, category: string | undefined) => void;
  setDocumentTags: (id: string, tags: string[]) => void;
  setDocumentCollection: (id: string, collectionId: string | undefined) => void;
  setDocumentLinkedGoal: (id: string, goalId: string | undefined) => void;
  deleteDocument: (id: string) => void;
  deleteAllDocuments: () => Promise<void>;
  addDocumentCollection: (name: string) => Promise<DocumentCollection | null>;
  deleteDocumentCollection: (id: string) => void;
  linkDocumentDateToEvent: (documentDateId: string, eventId: string) => void;
  linkDocumentTaskToTask: (documentTaskId: string, taskId: string) => void;
}

function reportSyncError(context: string, err: unknown) {
  console.error(`[Alxioum sync] ${context} failed:`, err);
}

/** Best-effort — a missed activity row must never block the mutation itself. */
function logGoalActivity(userId: string, goalId: string, kind: string, description: string) {
  db.insertGoalActivityRow(userId, goalId, kind, description).catch((e) => reportSyncError("log goal activity", e));
}

/** Best-effort — mirrors logGoalActivity. */
function logDocumentActivity(userId: string, documentId: string, kind: string, description: string) {
  db.insertDocumentActivityRow(userId, documentId, kind, description).catch((e) => reportSyncError("log document activity", e));
}

/** Best-effort — mirrors logGoalActivity, feeds the Business Builder timeline. */
function logBusinessActivity(userId: string, businessId: string, kind: string, description: string) {
  db.insertBusinessActivityRow(userId, businessId, kind, description).catch((e) => reportSyncError("log business activity", e));
}

export const useAlxioum = create<AlxioumState>((set, get) => {
  function synced(): string | null {
    const s = get();
    return backendConfigured && s.authStatus === "signed_in" ? s.authUserId : null;
  }

  async function loadUserData(userId: string, email: string) {
    set({ dataLoading: true, authError: null });
    try {
      const [
        profile,
        tasks,
        events,
        notifications,
        subjects,
        focusSessions,
        studentProfile,
        shoppingLists,
        shoppingItems,
        goals,
        goalMilestones,
        goalActions,
        goalActionLogs,
        businesses,
        businessMilestones,
        businessMetrics,
        businessExperiments,
        businessCustomers,
        businessFeedback,
        businessInsights,
        businessMissions,
        businessContent,
        businessCompetitors,
        routines,
        routineSteps,
        documents,
        documentCollections,
        documentDates,
        documentTasks,
      ] = await Promise.all([
        db.fetchProfile(userId),
        db.fetchTasks(userId),
        db.fetchEvents(userId),
        db.fetchNotifications(userId),
        db.fetchSubjects(userId),
        db.fetchFocusSessions(userId),
        db.fetchStudentProfile(userId),
        db.fetchShoppingLists(userId),
        db.fetchShoppingItems(userId),
        db.fetchGoals(userId),
        db.fetchGoalMilestones(userId),
        db.fetchGoalActions(userId),
        db.fetchGoalActionLogs(userId),
        db.fetchBusinesses(userId),
        db.fetchBusinessMilestones(userId),
        db.fetchBusinessMetrics(userId),
        db.fetchBusinessExperiments(userId),
        db.fetchBusinessCustomers(userId),
        db.fetchBusinessFeedback(userId),
        db.fetchBusinessInsights(userId),
        db.fetchBusinessMissions(userId),
        db.fetchBusinessContent(userId),
        db.fetchBusinessCompetitors(userId),
        db.fetchRoutines(userId),
        db.fetchRoutineSteps(userId),
        db.fetchDocuments(userId),
        db.fetchDocumentCollections(userId),
        db.fetchDocumentDates(userId),
        db.fetchDocumentTasks(userId),
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
            creditsBalance: 0,
          },
        tasks,
        events,
        notifications,
        subjects,
        focusSessions,
        studentProfile,
        shoppingLists,
        shoppingItems,
        goals,
        goalMilestones,
        goalActions,
        goalActionLogs,
        businesses,
        businessMilestones,
        businessMetrics,
        businessExperiments,
        businessCustomers,
        businessFeedback,
        businessInsights,
        businessMissions,
        businessContent,
        businessCompetitors,
        routines,
        routineSteps,
        documents,
        documentCollections,
        documentDates,
        documentTasks,
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
    shoppingLists: [],
    shoppingItems: [],
    goals: [],
    goalMilestones: [],
    goalActions: [],
    goalActionLogs: [],
    businesses: [],
    businessMilestones: [],
    businessMetrics: [],
    businessExperiments: [],
    businessCustomers: [],
    businessFeedback: [],
    businessInsights: [],
    businessMissions: [],
    businessContent: [],
    businessCompetitors: [],
    routines: [],
    routineSteps: [],
    documents: [],
    documentCollections: [],
    documentDates: [],
    documentTasks: [],
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
          set({
            authStatus: "signed_out",
            authUserId: null,
            authEmail: null,
            hydrated: false,
            profile: null,
            tasks: [],
            events: [],
            notifications: [],
            subjects: [],
            focusSessions: [],
            studentProfile: null,
            shoppingLists: [],
            shoppingItems: [],
            goals: [],
            goalMilestones: [],
            goalActions: [],
            goalActionLogs: [],
            businesses: [],
            businessMilestones: [],
            businessMetrics: [],
            businessExperiments: [],
            businessCustomers: [],
            businessFeedback: [],
            businessInsights: [],
            businessMissions: [],
            businessContent: [],
            businessCompetitors: [],
            routines: [],
            routineSteps: [],
            documents: [],
            documentCollections: [],
            documentDates: [],
            documentTasks: [],
          });
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
      set({
        authStatus: "signed_out",
        authUserId: null,
        authEmail: null,
        hydrated: false,
        profile: null,
        tasks: [],
        events: [],
        notifications: [],
        subjects: [],
        focusSessions: [],
        studentProfile: null,
        shoppingLists: [],
        shoppingItems: [],
        goals: [],
        goalMilestones: [],
        goalActions: [],
        goalActionLogs: [],
        businesses: [],
        businessMilestones: [],
        businessMetrics: [],
        businessExperiments: [],
        businessCustomers: [],
        businessFeedback: [],
        businessInsights: [],
        businessMissions: [],
        businessContent: [],
        businessCompetitors: [],
        routines: [],
        routineSteps: [],
        documents: [],
        documentCollections: [],
        documentDates: [],
        documentTasks: [],
      });
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
        const created = await db.insertEvent(userId, { ...event, source: "alxioum", timezone: event.timezone ?? get().profile?.timezone ?? "UTC" });
        set((s) => ({ events: [...s.events, created].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)) }));
        get()
          .getAccessToken()
          .then((token) => pushEventToGoogleClient(token, "create", created));
        return created;
      } catch (e) {
        reportSyncError("add event", e);
        return null;
      }
    },

    updateEvent: (id, patch) => {
      let merged: CalendarEvent | undefined;
      set((s) => ({
        events: s.events.map((e) => {
          if (e.id !== id) return e;
          merged = { ...e, ...patch };
          return merged;
        }),
      }));
      if (synced()) {
        db.updateEventRow(id, patch).catch((e) => reportSyncError("update event", e));
        if (merged) get().getAccessToken().then((token) => pushEventToGoogleClient(token, "update", merged!));
      }
    },

    removeEvent: (id) => {
      const existing = get().events.find((e) => e.id === id);
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      if (synced()) {
        db.deleteEventRow(id).catch((e) => reportSyncError("delete event", e));
        if (existing) get().getAccessToken().then((token) => pushEventToGoogleClient(token, "delete", existing));
      }
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

    addShoppingList: async (list) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertShoppingList(userId, list);
        set((s) => ({ shoppingLists: [...s.shoppingLists, created] }));
        return created;
      } catch (e) {
        reportSyncError("add shopping list", e);
        return null;
      }
    },

    deleteShoppingList: (id) => {
      set((s) => ({
        shoppingLists: s.shoppingLists.filter((l) => l.id !== id),
        shoppingItems: s.shoppingItems.filter((i) => i.listId !== id),
      }));
      if (synced()) db.deleteShoppingListRow(id).catch((e) => reportSyncError("delete shopping list", e));
    },

    addShoppingItem: async (item) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertShoppingItem(userId, item);
        set((s) => ({ shoppingItems: [...s.shoppingItems, created] }));
        return created;
      } catch (e) {
        reportSyncError("add shopping item", e);
        return null;
      }
    },

    toggleShoppingItem: (id) => {
      const existing = get().shoppingItems.find((i) => i.id === id);
      if (!existing) return;
      const done = !existing.done;
      set((s) => ({ shoppingItems: s.shoppingItems.map((i) => (i.id === id ? { ...i, done } : i)) }));
      if (synced()) db.updateShoppingItemRow(id, { done }).catch((e) => reportSyncError("toggle shopping item", e));
    },

    deleteShoppingItem: (id) => {
      set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => i.id !== id) }));
      if (synced()) db.deleteShoppingItemRow(id).catch((e) => reportSyncError("delete shopping item", e));
    },

    addGoal: async (goal) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertGoal(userId, goal);
        set((s) => ({ goals: [...s.goals, created] }));
        logGoalActivity(userId, created.id, "goal_created", `Created goal "${created.name}"`);
        return created;
      } catch (e) {
        reportSyncError("add goal", e);
        return null;
      }
    },

    updateGoal: (id, patch) => {
      const existing = get().goals.find((g) => g.id === id);
      set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      const userId = synced();
      if (userId) db.updateGoalRow(id, patch).catch((e) => reportSyncError("update goal", e));
      if (userId && existing) {
        if (patch.paused === true && !existing.paused) logGoalActivity(userId, id, "paused", `Paused "${existing.name}"`);
        else if (patch.paused === false && existing.paused) logGoalActivity(userId, id, "resumed", `Resumed "${existing.name}"`);
        if (patch.completed === true && !existing.completed) logGoalActivity(userId, id, "completed", `Completed "${existing.name}"`);
        if (patch.measurementCurrent !== undefined && patch.measurementCurrent !== existing.measurementCurrent) {
          logGoalActivity(userId, id, "progress_updated", `Updated progress to ${patch.measurementCurrent}${existing.measurementUnit ? ` ${existing.measurementUnit}` : ""}`);
        }
      }
    },

    deleteGoal: (id) => {
      set((s) => ({
        goals: s.goals.filter((g) => g.id !== id),
        goalMilestones: s.goalMilestones.filter((m) => m.goalId !== id),
        goalActions: s.goalActions.filter((a) => a.goalId !== id),
      }));
      if (synced()) db.deleteGoalRow(id).catch((e) => reportSyncError("delete goal", e));
    },

    addMilestone: async (milestone) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertGoalMilestone(userId, milestone);
        set((s) => ({ goalMilestones: [...s.goalMilestones, created] }));
        logGoalActivity(userId, milestone.goalId, "milestone_added", `Added milestone "${created.title}"`);
        return created;
      } catch (e) {
        reportSyncError("add milestone", e);
        return null;
      }
    },

    toggleMilestone: (id) => {
      const existing = get().goalMilestones.find((m) => m.id === id);
      if (!existing) return;
      const done = !existing.done;
      const goal = get().goals.find((g) => g.id === existing.goalId);
      // Recompute the parent goal's progress from real milestone completion —
      // mirrors goals_complete_milestone's server-side logic so the progress
      // bar stays correct whether a milestone is toggled from chat or the UI.
      // Only checklist-type goals derive progress from milestones; other
      // measurement types track progress via measurementCurrent instead.
      let progress: number | null = null;
      set((s) => {
        const goalMilestones = s.goalMilestones.map((m) => (m.id === id ? { ...m, done } : m));
        if (!goal || goal.measurementType !== "checklist") return { goalMilestones };
        const siblings = goalMilestones.filter((m) => m.goalId === existing.goalId);
        progress = siblings.length > 0 ? Math.round((siblings.filter((m) => m.done).length / siblings.length) * 100) : null;
        const goals = progress !== null ? s.goals.map((g) => (g.id === existing.goalId ? { ...g, progress: progress!, completed: progress! >= 100 } : g)) : s.goals;
        return { goalMilestones, goals };
      });
      const userId = synced();
      if (userId) {
        db.updateGoalMilestoneRow(id, { done }).catch((e) => reportSyncError("toggle milestone", e));
        if (progress !== null) db.updateGoalRow(existing.goalId, { progress, completed: progress >= 100 }).catch((e) => reportSyncError("update goal progress", e));
        logGoalActivity(userId, existing.goalId, done ? "milestone_completed" : "milestone_reopened", `${done ? "Completed" : "Reopened"} milestone "${existing.title}"`);
      }
    },

    addGoalAction: async (action) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertGoalAction(userId, action);
        set((s) => ({ goalActions: [...s.goalActions, created] }));
        logGoalActivity(userId, action.goalId, "action_added", `Added recurring action "${created.title}"`);
        return created;
      } catch (e) {
        reportSyncError("add goal action", e);
        return null;
      }
    },

    deleteGoalAction: (id) => {
      const existing = get().goalActions.find((a) => a.id === id);
      set((s) => ({
        goalActions: s.goalActions.filter((a) => a.id !== id),
        goalActionLogs: s.goalActionLogs.filter((l) => l.goalActionId !== id),
      }));
      const userId = synced();
      if (userId) {
        db.deleteGoalActionRow(id).catch((e) => reportSyncError("delete goal action", e));
        if (existing) logGoalActivity(userId, existing.goalId, "action_removed", `Removed recurring action "${existing.title}"`);
      }
    },

    toggleGoalActionLog: (goalActionId, logDate) => {
      const userId = synced();
      if (!userId) return;
      const action = get().goalActions.find((a) => a.id === goalActionId);
      const existingLog = get().goalActionLogs.find((l) => l.goalActionId === goalActionId && l.logDate === logDate);
      if (existingLog) {
        set((s) => ({ goalActionLogs: s.goalActionLogs.filter((l) => l.id !== existingLog.id) }));
        db.removeGoalActionLogRow(goalActionId, logDate).catch((e) => reportSyncError("remove goal action log", e));
        if (action) logGoalActivity(userId, action.goalId, "action_unlogged", `Unmarked "${action.title}" for ${logDate}`);
      } else {
        const optimistic: GoalActionLog = { id: newId(), goalActionId, logDate, createdAt: new Date().toISOString() };
        set((s) => ({ goalActionLogs: [...s.goalActionLogs, optimistic] }));
        db.addGoalActionLogRow(userId, goalActionId, logDate)
          .then((created) => set((s) => ({ goalActionLogs: s.goalActionLogs.map((l) => (l.id === optimistic.id ? created : l)) })))
          .catch((e) => reportSyncError("add goal action log", e));
        if (action) logGoalActivity(userId, action.goalId, "action_logged", `Marked "${action.title}" done for ${logDate}`);
      }
    },

    createBusinessGoal: async (input) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const goal = await db.insertGoal(userId, {
          name: input.name,
          description: input.ideaSummary ?? "",
          targetDate: input.targetDate,
          icon: "🚀",
          category: "Business",
          priority: "high",
          difficulty: "ambitious",
          measurementType: "numeric",
          measurementUnit: input.measurementUnit ?? "revenue/month",
          measurementTarget: input.measurementTarget,
          kind: "business",
        });
        set((s) => ({ goals: [...s.goals, goal] }));
        const business = await db.insertBusiness(userId, {
          goalId: goal.id,
          name: input.name,
          ideaSummary: input.ideaSummary,
          problem: input.problem,
          solution: input.solution,
          targetCustomer: input.targetCustomer,
          valueProposition: input.valueProposition,
          revenueModel: input.revenueModel,
          price: input.price,
          pricePeriod: input.pricePeriod,
          targetCustomerCount: input.targetCustomerCount,
        });
        set((s) => ({ businesses: [...s.businesses, business] }));
        const createdMilestones = await Promise.all(
          SEED_MILESTONES.map((m, i) => db.insertBusinessMilestone(userId, { businessId: business.id, stage: m.stage, title: m.title, sortOrder: i }))
        );
        set((s) => ({ businessMilestones: [...s.businessMilestones, ...createdMilestones] }));
        logGoalActivity(userId, goal.id, "goal_created", `Created business goal "${goal.name}"`);
        logBusinessActivity(userId, business.id, "created", `Started building "${business.name}"`);
        return business;
      } catch (e) {
        reportSyncError("create business goal", e);
        return null;
      }
    },

    updateBusiness: (id, patch) => {
      const existing = get().businesses.find((b) => b.id === id);
      set((s) => ({ businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      const userId = synced();
      if (userId) db.updateBusinessRow(id, patch).catch((e) => reportSyncError("update business", e));
      if (userId && existing && patch.stage !== undefined && patch.stage !== existing.stage) {
        logBusinessActivity(userId, id, "stage_changed", `Moved to ${patch.stage.replace(/_/g, " ")}`);
      }
    },

    deleteBusiness: (id) => {
      const business = get().businesses.find((b) => b.id === id);
      if (!business) return;
      set((s) => ({
        businesses: s.businesses.filter((b) => b.id !== id),
        businessMilestones: s.businessMilestones.filter((m) => m.businessId !== id),
        businessMetrics: s.businessMetrics.filter((m) => m.businessId !== id),
        businessExperiments: s.businessExperiments.filter((e) => e.businessId !== id),
        businessCustomers: s.businessCustomers.filter((c) => c.businessId !== id),
        businessFeedback: s.businessFeedback.filter((f) => f.businessId !== id),
        businessInsights: s.businessInsights.filter((i) => i.businessId !== id),
        businessMissions: s.businessMissions.filter((m) => m.businessId !== id),
        businessContent: s.businessContent.filter((c) => c.businessId !== id),
        businessCompetitors: s.businessCompetitors.filter((c) => c.businessId !== id),
        goals: s.goals.filter((g) => g.id !== business.goalId),
      }));
      // Deleting the linked goal cascades (FK on delete cascade) through the
      // business row and every business_* child table server-side — one
      // delete covers the whole business, matching the "delete everything"
      // requirement without a second cascading code path here.
      if (synced()) db.deleteGoalRow(business.goalId).catch((e) => reportSyncError("delete business", e));
    },

    addBusinessMilestone: async (m) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessMilestone(userId, m);
        set((s) => ({ businessMilestones: [...s.businessMilestones, created] }));
        logBusinessActivity(userId, m.businessId, "milestone_added", `Added milestone "${created.title}"`);
        return created;
      } catch (e) {
        reportSyncError("add business milestone", e);
        return null;
      }
    },

    toggleBusinessMilestone: (id) => {
      const existing = get().businessMilestones.find((m) => m.id === id);
      if (!existing) return;
      const done = !existing.done;
      const completedAt = done ? new Date().toISOString() : undefined;
      set((s) => ({ businessMilestones: s.businessMilestones.map((m) => (m.id === id ? { ...m, done, completedAt } : m)) }));
      const userId = synced();
      if (userId) {
        db.updateBusinessMilestoneRow(id, { done, completedAt: completedAt ?? null } as Partial<BusinessMilestone>).catch((e) => reportSyncError("toggle business milestone", e));
        logBusinessActivity(userId, existing.businessId, done ? "milestone_completed" : "milestone_reopened", `${done ? "Completed" : "Reopened"} milestone "${existing.title}"`);
      }
    },

    addBusinessMetric: async (m) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessMetric(userId, m);
        set((s) => ({ businessMetrics: [...s.businessMetrics, created] }));
        logBusinessActivity(userId, m.businessId, "metrics_recorded", "Recorded updated business metrics");
        return created;
      } catch (e) {
        reportSyncError("add business metric", e);
        return null;
      }
    },

    addBusinessExperiment: async (e) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessExperiment(userId, e);
        set((s) => ({ businessExperiments: [...s.businessExperiments, created] }));
        logBusinessActivity(userId, e.businessId, "experiment_created", `Started experiment: "${created.question}"`);
        return created;
      } catch (err) {
        reportSyncError("add business experiment", err);
        return null;
      }
    },

    updateBusinessExperiment: (id, patch) => {
      const existing = get().businessExperiments.find((e) => e.id === id);
      set((s) => ({ businessExperiments: s.businessExperiments.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      const userId = synced();
      if (userId) db.updateBusinessExperimentRow(id, patch).catch((e) => reportSyncError("update business experiment", e));
      if (userId && existing && patch.status === "completed" && existing.status !== "completed") {
        logBusinessActivity(userId, existing.businessId, "experiment_completed", `Completed experiment: "${existing.question}"`);
      }
    },

    addBusinessCustomer: async (c) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessCustomer(userId, c);
        set((s) => ({ businessCustomers: [...s.businessCustomers, created] }));
        logBusinessActivity(userId, c.businessId, "customer_added", `Added ${created.stage}: "${created.name}"`);
        return created;
      } catch (e) {
        reportSyncError("add business customer", e);
        return null;
      }
    },

    updateBusinessCustomer: (id, patch) => {
      set((s) => ({ businessCustomers: s.businessCustomers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      if (synced()) db.updateBusinessCustomerRow(id, patch).catch((e) => reportSyncError("update business customer", e));
    },

    addBusinessFeedback: async (f) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessFeedback(userId, f);
        set((s) => ({ businessFeedback: [...s.businessFeedback, created] }));
        logBusinessActivity(userId, f.businessId, "feedback_recorded", `Recorded ${created.kind.replace(/_/g, " ")}`);
        return created;
      } catch (e) {
        reportSyncError("add business feedback", e);
        return null;
      }
    },

    addBusinessInsight: async (i) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessInsight(userId, i);
        set((s) => ({ businessInsights: [...s.businessInsights, created] }));
        return created;
      } catch (e) {
        reportSyncError("add business insight", e);
        return null;
      }
    },

    updateBusinessInsight: (id, patch) => {
      const existing = get().businessInsights.find((i) => i.id === id);
      set((s) => ({ businessInsights: s.businessInsights.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
      const userId = synced();
      if (userId) db.updateBusinessInsightRow(id, patch).catch((e) => reportSyncError("update business insight", e));
      if (userId && existing && patch.status !== undefined && patch.status !== existing.status) {
        logBusinessActivity(userId, existing.businessId, `${existing.kind}_${patch.status}`, `${patch.status === "accepted" ? "Accepted" : patch.status === "ignored" ? "Ignored" : "Resolved"} ${existing.kind}: "${existing.title}"`);
      }
    },

    addBusinessMission: async (m) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessMission(userId, m);
        set((s) => ({ businessMissions: [...s.businessMissions, created] }));
        return created;
      } catch (e) {
        reportSyncError("add business mission", e);
        return null;
      }
    },

    updateBusinessMission: (id, patch) => {
      const existing = get().businessMissions.find((m) => m.id === id);
      set((s) => ({ businessMissions: s.businessMissions.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
      const userId = synced();
      if (userId) db.updateBusinessMissionRow(id, patch).catch((e) => reportSyncError("update business mission", e));
      if (userId && existing && patch.status === "completed" && existing.status !== "completed") {
        logBusinessActivity(userId, existing.businessId, "mission_completed", `Completed mission: "${existing.title}"`);
      }
    },

    addBusinessContent: async (c) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessContent(userId, c);
        set((s) => ({ businessContent: [...s.businessContent, created] }));
        return created;
      } catch (e) {
        reportSyncError("add business content", e);
        return null;
      }
    },

    updateBusinessContent: (id, patch) => {
      const existing = get().businessContent.find((c) => c.id === id);
      set((s) => ({ businessContent: s.businessContent.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      const userId = synced();
      if (userId) db.updateBusinessContentRow(id, patch).catch((e) => reportSyncError("update business content", e));
      if (userId && existing && patch.status === "published" && existing.status !== "published") {
        logBusinessActivity(userId, existing.businessId, "content_published", `Published: "${existing.idea}"`);
      }
    },

    addBusinessCompetitor: async (c) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertBusinessCompetitor(userId, c);
        set((s) => ({ businessCompetitors: [...s.businessCompetitors, created] }));
        return created;
      } catch (e) {
        reportSyncError("add business competitor", e);
        return null;
      }
    },

    addRoutine: async (routine) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertRoutine(userId, routine);
        set((s) => ({ routines: [...s.routines, created] }));
        return created;
      } catch (e) {
        reportSyncError("add routine", e);
        return null;
      }
    },

    deleteRoutine: (id) => {
      set((s) => ({
        routines: s.routines.filter((r) => r.id !== id),
        routineSteps: s.routineSteps.filter((step) => step.routineId !== id),
      }));
      if (synced()) db.deleteRoutineRow(id).catch((e) => reportSyncError("delete routine", e));
    },

    addRoutineStep: async (step) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertRoutineStep(userId, step);
        set((s) => ({ routineSteps: [...s.routineSteps, created] }));
        return created;
      } catch (e) {
        reportSyncError("add routine step", e);
        return null;
      }
    },

    toggleRoutineStep: (id) => {
      const existing = get().routineSteps.find((s) => s.id === id);
      if (!existing) return;
      const done = !existing.done;
      set((s) => ({ routineSteps: s.routineSteps.map((step) => (step.id === id ? { ...step, done } : step)) }));
      if (synced()) db.updateRoutineStepRow(id, { done }).catch((e) => reportSyncError("toggle routine step", e));
    },

    deleteRoutineStep: (id) => {
      set((s) => ({ routineSteps: s.routineSteps.filter((step) => step.id !== id) }));
      if (synced()) db.deleteRoutineStepRow(id).catch((e) => reportSyncError("delete routine step", e));
    },

    moveRoutineStep: (id, direction) => {
      const current = get().routineSteps.find((s) => s.id === id);
      if (!current) return;
      const siblings = get()
        .routineSteps.filter((s) => s.routineId === current.routineId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = siblings.findIndex((s) => s.id === id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= siblings.length) return;
      const other = siblings[swapIndex];
      const [aOrder, bOrder] = [current.sortOrder, other.sortOrder];
      set((s) => ({
        routineSteps: s.routineSteps.map((step) => {
          if (step.id === current.id) return { ...step, sortOrder: bOrder };
          if (step.id === other.id) return { ...step, sortOrder: aOrder };
          return step;
        }),
      }));
      if (synced()) {
        db.updateRoutineStepRow(current.id, { sortOrder: bOrder }).catch((e) => reportSyncError("reorder routine step", e));
        db.updateRoutineStepRow(other.id, { sortOrder: aOrder }).catch((e) => reportSyncError("reorder routine step", e));
      }
    },

    uploadDocument: async (file) => {
      const userId = synced();
      if (!userId) return { document: null, error: "Your session expired. Please sign in again." };
      try {
        const token = await get().getAccessToken();
        if (!token) return { document: null, error: "Your session expired. Please sign in again." };
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/documents/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        const json = await res.json();
        if (!res.ok) return { document: null, error: json.error ?? "Couldn't upload that file." };
        const document = json.document as Document;
        const dates = (json.dates ?? []) as DocumentDate[];
        const tasksFound = (json.tasks ?? []) as DocumentTask[];
        set((s) => ({
          documents: [document, ...s.documents],
          documentDates: [...s.documentDates, ...dates],
          documentTasks: [...s.documentTasks, ...tasksFound],
        }));
        return { document };
      } catch (e) {
        reportSyncError("upload document", e);
        return { document: null, error: "Couldn't upload that file." };
      }
    },

    openDocument: (id) => {
      const now = new Date().toISOString();
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, lastOpenedAt: now } : d)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentRow(id, { lastOpenedAt: now }).catch((e) => reportSyncError("open document", e));
        logDocumentActivity(userId, id, "opened", "Document opened");
      }
    },

    toggleStarDocument: (id) => {
      const existing = get().documents.find((d) => d.id === id);
      if (!existing) return;
      const starred = !existing.starred;
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, starred } : d)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentRow(id, { starred }).catch((e) => reportSyncError("toggle star document", e));
        logDocumentActivity(userId, id, starred ? "starred" : "unstarred", starred ? "Starred this document" : "Unstarred this document");
      }
    },

    setDocumentCategory: (id, category) => {
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, category } : d)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentRow(id, { category }).catch((e) => reportSyncError("set document category", e));
        logDocumentActivity(userId, id, "category_changed", category ? `Set category to "${category}"` : "Cleared category");
      }
    },

    setDocumentTags: (id, tags) => {
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, tags } : d)) }));
      if (synced()) db.updateDocumentRow(id, { tags }).catch((e) => reportSyncError("set document tags", e));
    },

    setDocumentCollection: (id, collectionId) => {
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, collectionId } : d)) }));
      if (synced()) db.updateDocumentRow(id, { collectionId }).catch((e) => reportSyncError("set document collection", e));
    },

    setDocumentLinkedGoal: (id, goalId) => {
      const existing = get().documents.find((d) => d.id === id);
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, linkedGoalId: goalId } : d)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentRow(id, { linkedGoalId: goalId }).catch((e) => reportSyncError("set document linked goal", e));
        if (goalId) logDocumentActivity(userId, id, "connected_to_goal", "Connected to a goal");
        else if (existing?.linkedGoalId) logDocumentActivity(userId, id, "disconnected_from_goal", "Disconnected from goal");
      }
    },

    linkDocumentDateToEvent: (documentDateId, eventId) => {
      const dateEntry = get().documentDates.find((d) => d.id === documentDateId);
      set((s) => ({ documentDates: s.documentDates.map((d) => (d.id === documentDateId ? { ...d, addedToCalendarEventId: eventId } : d)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentDateRow(documentDateId, { addedToCalendarEventId: eventId }).catch((e) => reportSyncError("link document date to event", e));
        if (dateEntry) logDocumentActivity(userId, dateEntry.documentId, "date_added_to_calendar", `Added "${dateEntry.label}" to calendar`);
      }
    },

    linkDocumentTaskToTask: (documentTaskId, taskId) => {
      const taskEntry = get().documentTasks.find((t) => t.id === documentTaskId);
      set((s) => ({ documentTasks: s.documentTasks.map((t) => (t.id === documentTaskId ? { ...t, createdTaskId: taskId } : t)) }));
      const userId = synced();
      if (userId) {
        db.updateDocumentTaskRow(documentTaskId, { createdTaskId: taskId }).catch((e) => reportSyncError("link document task to task", e));
        if (taskEntry) logDocumentActivity(userId, taskEntry.documentId, "task_created", `Created task "${taskEntry.title}"`);
      }
    },

    deleteDocument: (id) => {
      const existing = get().documents.find((d) => d.id === id);
      if (!existing) return;
      set((s) => ({
        documents: s.documents.filter((d) => d.id !== id),
        documentDates: s.documentDates.filter((d) => d.documentId !== id),
        documentTasks: s.documentTasks.filter((t) => t.documentId !== id),
      }));
      if (synced()) db.deleteDocumentRow(id, existing.storagePath).catch((e) => reportSyncError("delete document", e));
    },

    deleteAllDocuments: async () => {
      const userId = synced();
      set({ documents: [], documentDates: [], documentTasks: [] });
      if (!userId) return;
      try {
        await db.deleteAllDocuments(userId);
      } catch (e) {
        reportSyncError("delete all documents", e);
      }
    },

    addDocumentCollection: async (name) => {
      const userId = synced();
      if (!userId) return null;
      try {
        const created = await db.insertDocumentCollection(userId, name);
        set((s) => ({ documentCollections: [...s.documentCollections, created] }));
        return created;
      } catch (e) {
        reportSyncError("add document collection", e);
        return null;
      }
    },

    deleteDocumentCollection: (id) => {
      set((s) => ({
        documentCollections: s.documentCollections.filter((c) => c.id !== id),
        documents: s.documents.map((d) => (d.collectionId === id ? { ...d, collectionId: undefined } : d)),
      }));
      if (synced()) db.deleteDocumentCollectionRow(id).catch((e) => reportSyncError("delete document collection", e));
    },
  };
});

export { newId };
