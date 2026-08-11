"use client";

import { create } from "zustand";
import {
  demoAgents,
  demoBudgets,
  demoDocuments,
  demoEvents,
  demoGoals,
  demoHabits,
  demoLists,
  demoMemory,
  demoProfile,
  demoSubscriptions,
  demoTasks,
  demoTransactions,
} from "./demoData";
import {
  Agent,
  AppNotification,
  Budget,
  CalendarEvent,
  ChatMessage,
  Goal,
  Habit,
  LifeDocument,
  LifeList,
  MemoryItem,
  PendingAction,
  Profile,
  Subscription,
  Task,
  Transaction,
} from "./types";
import { answerQuery, EngineState } from "./aiEngine";
import { newId, todayISO, uid } from "./utils";
import { isSupabaseConfigured, supabase } from "./supabase/client";
import * as db from "./db";

export type QuickAddType = "task" | "event" | "note" | "document" | "expense" | "goal";
export type AuthStatus = "checking" | "signed_out" | "signed_in";

export const backendConfigured = isSupabaseConfigured;

interface AlxioumState {
  hydrated: boolean;
  profile: Profile;
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  habits: Habit[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  budgets: Budget[];
  documents: LifeDocument[];
  lists: LifeList[];
  memory: MemoryItem[];
  agents: Agent[];
  notifications: AppNotification[];
  chat: ChatMessage[];
  commandOpen: boolean;
  quickAdd: QuickAddType | null;

  authStatus: AuthStatus;
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  authBusy: boolean;
  dataLoading: boolean;

  setHydrated: () => void;
  setCommandOpen: (open: boolean) => void;
  openQuickAdd: (type: QuickAddType) => void;
  closeQuickAdd: () => void;

  initAuth: () => Promise<void>;
  enterWithName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;

  toggleTask: (id: string) => void;
  addTask: (task: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  moveEvent: (id: string, date: string, startTime: string, endTime: string) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;

  toggleHabit: (id: string, date?: string) => void;

  addTransaction: (tx: Omit<Transaction, "id">) => void;

  addListItem: (listId: string, label: string) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  removeCheckedItems: (listId: string) => void;
  createList: (name: string, emoji?: string) => LifeList;

  addGoal: (name: string) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestone: (goalId: string, title: string) => void;

  toggleMemory: (id: string) => void;
  deleteMemory: (id: string) => void;
  setMemoryEnabled: (enabled: boolean) => void;

  toggleAgent: (id: string) => void;

  sendChatMessage: (text: string) => void;
  applyAction: (action: PendingAction, messageId?: string) => void;
  dismissAction: (actionId: string, messageId?: string) => void;

  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;

  updateProfile: (patch: Partial<Profile>) => void;
  addDocument: (doc: Omit<LifeDocument, "id" | "uploadedAt">) => void;
}

function engineSnapshot(s: AlxioumState): EngineState {
  return {
    tasks: s.tasks,
    events: s.events,
    goals: s.goals,
    habits: s.habits,
    transactions: s.transactions,
    lists: s.lists,
    memory: s.memory,
  };
}

function reportSyncError(context: string, err: unknown) {
  // Local UI already reflects the change (optimistic); a sync failure means
  // it hasn't actually saved to the account yet. Surface it, don't hide it.
  console.error(`[Alxioum sync] ${context} failed:`, err);
}

export const useAlxioum = create<AlxioumState>((set, get) => {
  function synced(): string | null {
    const s = get();
    return backendConfigured && s.authStatus === "signed_in" ? s.authUserId : null;
  }

  return {
    hydrated: false,
    profile: demoProfile,
    tasks: demoTasks,
    events: demoEvents,
    goals: demoGoals,
    habits: demoHabits,
    transactions: demoTransactions,
    subscriptions: demoSubscriptions,
    budgets: demoBudgets,
    documents: demoDocuments,
    lists: demoLists,
    memory: demoMemory,
    agents: demoAgents,
    notifications: [
      {
        id: uid("notif"),
        title: "History exam in 3 days",
        body: "Friday, 10:00 AM. You have two study blocks planned.",
        createdAt: new Date().toISOString(),
        read: false,
        kind: "deadline",
      },
      {
        id: uid("notif"),
        title: "You have 45 minutes free before tennis",
        body: "Want Alxioum to schedule a quick study block?",
        createdAt: new Date().toISOString(),
        read: false,
        kind: "schedule",
      },
    ],
    chat: [],
    commandOpen: false,
    quickAdd: null,

    authStatus: backendConfigured ? "checking" : "signed_out",
    authUserId: null,
    authEmail: null,
    authError: null,
    authBusy: false,
    dataLoading: false,

    setHydrated: () => set({ hydrated: true }),
    setCommandOpen: (open) => set({ commandOpen: open }),
    openQuickAdd: (type) => set({ quickAdd: type, commandOpen: false }),
    closeQuickAdd: () => set({ quickAdd: null }),

    initAuth: async () => {
      if (!backendConfigured || !supabase) {
        set({ authStatus: "signed_out" });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await handleSignedIn(session.user.id, session.user.email ?? "");
      } else {
        set({ authStatus: "signed_out" });
      }

      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false });
        }
      });

      async function handleSignedIn(userId: string, email: string) {
        set({ authStatus: "signed_in", authUserId: userId, authEmail: email, dataLoading: true, authError: null });
        try {
          const seeded = await db.isAccountSeeded(userId);
          if (!seeded) {
            await db.seedAccountWithDemoData(userId);
            await db.markAccountSeeded(userId);
          }
          const all = await db.loadAllUserData(userId);
          set({
            profile: all.profile ?? { ...demoProfile, name: email.split("@")[0] || "You", email, avatarInitials: (email[0] ?? "U").toUpperCase() },
            tasks: all.tasks,
            events: all.events,
            goals: all.goals,
            habits: all.habits,
            transactions: all.transactions,
            subscriptions: all.subscriptions,
            budgets: all.budgets,
            documents: all.documents,
            lists: all.lists,
            memory: all.memory,
            agents: all.agents,
            notifications: all.notifications,
            chat: all.chat,
            dataLoading: false,
            hydrated: true,
          });
        } catch (err) {
          reportSyncError("load account data", err);
          set({ dataLoading: false, authError: err instanceof Error ? err.message : "Couldn't load your data." });
        }
      }

      // signUp/signIn call this same logic via the module-level ref below.
      handleSignedInRef.current = handleSignedIn;
    },

    // No email/password for now — just a name, so there's nothing to confirm
    // and nothing that can bounce to an unreachable redirect. Still a real
    // Supabase user (signInAnonymously issues a real auth.uid() + session),
    // so RLS and persistence work exactly as they do for a full account —
    // the only difference is there's no email tying it back to a person, so
    // signing out or clearing the browser loses access to that account.
    enterWithName: async (name) => {
      if (!supabase) return;
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { name } } });
      if (error || !data.user) {
        set({ authBusy: false, authError: error?.message ?? "Something went wrong. Please try again." });
        return;
      }
      await handleSignedInRef.current?.(data.user.id, data.user.email ?? "");
      set({ authBusy: false });
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false });
    },

    toggleTask: (id) => {
      const existing = get().tasks.find((t) => t.id === id);
      if (!existing) return;
      const done = !existing.done;
      const completedAt = done ? new Date().toISOString() : undefined;
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done, completedAt } : t)) }));
      const uidVal = synced();
      if (uidVal) db.updateTaskRow(id, { done, completedAt }).catch((e) => reportSyncError("toggle task", e));
    },

    addTask: (task) => {
      const newTask: Task = {
        id: newId(),
        title: task.title,
        description: task.description,
        done: false,
        dueDate: task.dueDate,
        priority: task.priority ?? "medium",
        estimatedMinutes: task.estimatedMinutes,
        category: task.category ?? "personal",
        project: task.project,
        goalId: task.goalId,
        recurring: task.recurring ?? "none",
        subtasks: task.subtasks ?? [],
        aiContext: task.aiContext,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ tasks: [newTask, ...s.tasks] }));
      const uidVal = synced();
      if (uidVal) db.insertTask(uidVal, newTask).catch((e) => reportSyncError("add task", e));
      return newTask;
    },

    updateTask: (id, patch) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      if (synced()) db.updateTaskRow(id, patch).catch((e) => reportSyncError("update task", e));
    },

    deleteTask: (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      if (synced()) db.deleteTaskRow(id).catch((e) => reportSyncError("delete task", e));
    },

    addEvent: (event) => {
      const newEvent: CalendarEvent = { ...event, id: newId() };
      set((s) => ({ events: [...s.events, newEvent] }));
      const uidVal = synced();
      if (uidVal) db.insertEvent(uidVal, newEvent).catch((e) => reportSyncError("add event", e));
      return newEvent;
    },

    moveEvent: (id, date, startTime, endTime) => {
      set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, date, startTime, endTime } : e)) }));
      if (synced()) db.updateEventRow(id, { date, startTime, endTime }).catch((e) => reportSyncError("move event", e));
    },

    updateEvent: (id, patch) => {
      set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      if (synced()) db.updateEventRow(id, patch).catch((e) => reportSyncError("update event", e));
    },

    removeEvent: (id) => {
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      if (synced()) db.deleteEventRow(id).catch((e) => reportSyncError("delete event", e));
    },

    toggleHabit: (id, date) => {
      const day = date ?? todayISO();
      const existing = get().habits.find((h) => h.id === id);
      if (!existing) return;
      const history = { ...existing.history, [day]: !existing.history[day] };
      set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, history } : h)) }));
      if (synced()) db.updateHabitRow(id, { history }).catch((e) => reportSyncError("toggle habit", e));
    },

    addTransaction: (tx) => {
      const newTx: Transaction = { ...tx, id: newId() };
      set((s) => ({ transactions: [newTx, ...s.transactions] }));
      const uidVal = synced();
      if (uidVal) db.insertTransaction(uidVal, newTx).catch((e) => reportSyncError("add transaction", e));
    },

    addListItem: (listId, label) => {
      let updatedItems: LifeList["items"] | null = null;
      set((s) => ({
        lists: s.lists.map((l) => {
          if (l.id !== listId) return l;
          updatedItems = [...l.items, { id: uid("li"), label, done: false }];
          return { ...l, items: updatedItems };
        }),
      }));
      if (synced() && updatedItems) db.updateListRow(listId, { items: updatedItems }).catch((e) => reportSyncError("add list item", e));
    },

    toggleListItem: (listId, itemId) => {
      let updatedItems: LifeList["items"] | null = null;
      set((s) => ({
        lists: s.lists.map((l) => {
          if (l.id !== listId) return l;
          updatedItems = l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
          return { ...l, items: updatedItems };
        }),
      }));
      if (synced() && updatedItems) db.updateListRow(listId, { items: updatedItems }).catch((e) => reportSyncError("toggle list item", e));
    },

    removeCheckedItems: (listId) => {
      let updatedItems: LifeList["items"] | null = null;
      set((s) => ({
        lists: s.lists.map((l) => {
          if (l.id !== listId) return l;
          updatedItems = l.items.filter((i) => !i.done);
          return { ...l, items: updatedItems };
        }),
      }));
      if (synced() && updatedItems) db.updateListRow(listId, { items: updatedItems }).catch((e) => reportSyncError("clear list items", e));
    },

    createList: (name, emoji = "📋") => {
      const newList: LifeList = { id: newId(), name, emoji, items: [], kind: "custom" };
      set((s) => ({ lists: [...s.lists, newList] }));
      const uidVal = synced();
      if (uidVal) db.insertList(uidVal, newList).catch((e) => reportSyncError("create list", e));
      return newList;
    },

    addGoal: (name) => {
      const goal: Goal = {
        id: newId(),
        name,
        why: "",
        progress: 0,
        category: "personal",
        milestones: [],
        linkedTaskIds: [],
        linkedHabitIds: [],
        aiPlan: "Alxioum will suggest a plan once this goal has milestones and a deadline.",
      };
      set((s) => ({ goals: [...s.goals, goal] }));
      const uidVal = synced();
      if (uidVal) db.insertGoal(uidVal, goal).catch((e) => reportSyncError("add goal", e));
      return goal;
    },

    updateGoal: (id, patch) => {
      set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      if (synced()) db.updateGoalRow(id, patch).catch((e) => reportSyncError("update goal", e));
    },

    addMilestone: (goalId, title) => {
      let updatedMilestones: Goal["milestones"] | null = null;
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g;
          updatedMilestones = [...g.milestones, { id: uid("m"), title, done: false }];
          return { ...g, milestones: updatedMilestones };
        }),
      }));
      if (synced() && updatedMilestones) db.updateGoalRow(goalId, { milestones: updatedMilestones }).catch((e) => reportSyncError("add milestone", e));
    },

    toggleMilestone: (goalId, milestoneId) => {
      let updatedMilestones: Goal["milestones"] | null = null;
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g;
          updatedMilestones = g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
          return { ...g, milestones: updatedMilestones };
        }),
      }));
      if (synced() && updatedMilestones) db.updateGoalRow(goalId, { milestones: updatedMilestones }).catch((e) => reportSyncError("toggle milestone", e));
    },

    toggleMemory: (id) => {
      const existing = get().memory.find((m) => m.id === id);
      if (!existing) return;
      const active = !existing.active;
      set((s) => ({ memory: s.memory.map((m) => (m.id === id ? { ...m, active } : m)) }));
      if (synced()) db.updateMemoryRow(id, { active }).catch((e) => reportSyncError("toggle memory", e));
    },

    deleteMemory: (id) => {
      set((s) => ({ memory: s.memory.filter((m) => m.id !== id) }));
      if (synced()) db.deleteMemoryRow(id).catch((e) => reportSyncError("delete memory", e));
    },

    setMemoryEnabled: (enabled) => {
      set((s) => ({ profile: { ...s.profile, memoryEnabled: enabled } }));
      const uidVal = synced();
      if (uidVal) db.updateProfileRow(uidVal, { memoryEnabled: enabled }).catch((e) => reportSyncError("update memory setting", e));
    },

    toggleAgent: (id) => {
      const existing = get().agents.find((a) => a.id === id);
      if (!existing) return;
      const active = !existing.active;
      set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, installed: true, active } : a)) }));
      const uidVal = synced();
      if (uidVal) db.upsertUserAgent(uidVal, id, { installed: true, active }).catch((e) => reportSyncError("toggle agent", e));
    },

    sendChatMessage: (text) => {
      const userMsg: ChatMessage = { id: newId(), role: "user", content: text, createdAt: new Date().toISOString() };
      set((s) => ({ chat: [...s.chat, userMsg] }));

      const state = get();
      const reply = answerQuery(text, engineSnapshot(state));
      const aiMsg: ChatMessage = {
        id: newId(),
        role: "ai",
        content: reply.content,
        createdAt: new Date().toISOString(),
        actions: reply.actions,
      };
      set((s) => ({ chat: [...s.chat, aiMsg] }));

      const uidVal = synced();
      if (uidVal) {
        db.insertChatMessage(uidVal, userMsg).catch((e) => reportSyncError("save chat message", e));
        db.insertChatMessage(uidVal, aiMsg).catch((e) => reportSyncError("save AI reply", e));
      }
    },

    applyAction: (action, messageId) => {
      const s = get();
      switch (action.kind) {
        case "create_event": {
          const p = action.payload as { title: string; date: string; startTime: string; endTime: string; type: CalendarEvent["type"]; linkedTaskId?: string };
          s.addEvent({ title: p.title, date: p.date, startTime: p.startTime, endTime: p.endTime, type: p.type, aiGenerated: true, movable: true, linkedTaskId: p.linkedTaskId });
          break;
        }
        case "create_task": {
          const p = action.payload as Partial<Task> & { title: string };
          s.addTask(p);
          break;
        }
        case "add_list_item": {
          const p = action.payload as { listId?: string; label?: string; createList?: boolean; name?: string };
          if (p.createList && p.name) {
            s.createList(p.name);
          } else if (p.listId && p.label) {
            s.addListItem(p.listId, p.label);
          }
          break;
        }
        case "create_reminder": {
          const p = action.payload as { title: string; date: string };
          s.addNotification({ title: p.title, body: `Reminder for ${p.date}`, kind: "system" });
          break;
        }
        case "create_goal": {
          const p = action.payload as { name: string };
          s.addGoal(p.name);
          break;
        }
        case "add_expense": {
          const p = action.payload as Omit<Transaction, "id">;
          s.addTransaction(p);
          break;
        }
      }

      if (messageId) {
        let updatedActions: PendingAction[] | undefined;
        set((st) => ({
          chat: st.chat.map((m) => {
            if (m.id !== messageId) return m;
            updatedActions = m.actions?.filter((a) => a.id !== action.id);
            return { ...m, actions: updatedActions };
          }),
        }));
        if (synced() && updatedActions) db.updateChatMessageActions(messageId, updatedActions).catch((e) => reportSyncError("update chat actions", e));
      }
    },

    dismissAction: (actionId, messageId) => {
      if (messageId) {
        let updatedActions: PendingAction[] | undefined;
        set((st) => ({
          chat: st.chat.map((m) => {
            if (m.id !== messageId) return m;
            updatedActions = m.actions?.filter((a) => a.id !== actionId);
            return { ...m, actions: updatedActions };
          }),
        }));
        if (synced() && updatedActions) db.updateChatMessageActions(messageId, updatedActions).catch((e) => reportSyncError("dismiss chat action", e));
      }
    },

    markNotificationRead: (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      if (synced()) db.markNotificationReadRow(id).catch((e) => reportSyncError("mark notification read", e));
    },

    addNotification: (n) => {
      const newNotif: AppNotification = { ...n, id: newId(), createdAt: new Date().toISOString(), read: false };
      set((s) => ({ notifications: [newNotif, ...s.notifications] }));
      const uidVal = synced();
      if (uidVal) db.insertNotification(uidVal, newNotif).catch((e) => reportSyncError("add notification", e));
    },

    updateProfile: (patch) => {
      set((s) => ({ profile: { ...s.profile, ...patch } }));
      const uidVal = synced();
      if (uidVal) db.updateProfileRow(uidVal, patch).catch((e) => reportSyncError("update profile", e));
    },

    addDocument: (doc) => {
      const newDoc: LifeDocument = { ...doc, id: newId(), uploadedAt: new Date().toISOString().slice(0, 10) };
      set((s) => ({ documents: [newDoc, ...s.documents] }));
      const uidVal = synced();
      if (uidVal) db.insertDocument(uidVal, newDoc).catch((e) => reportSyncError("add document", e));
    },
  };
});

// initAuth defines handleSignedIn as a closure each call; signUp/signIn need
// to reach the *current* one without re-deriving it, hence this ref.
const handleSignedInRef: { current: ((userId: string, email: string) => Promise<void>) | null } = { current: null };
