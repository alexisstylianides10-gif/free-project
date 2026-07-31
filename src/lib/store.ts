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
import { todayISO, uid } from "./utils";

export type QuickAddType = "task" | "event" | "note" | "document" | "expense" | "goal";

interface LifeOSState {
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

  setHydrated: () => void;
  setCommandOpen: (open: boolean) => void;
  openQuickAdd: (type: QuickAddType) => void;
  closeQuickAdd: () => void;

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

function engineSnapshot(s: LifeOSState): EngineState {
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

export const useLifeOS = create<LifeOSState>((set, get) => ({
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
      body: "Want LifeOS to schedule a quick study block?",
      createdAt: new Date().toISOString(),
      read: false,
      kind: "schedule",
    },
  ],
  chat: [],
  commandOpen: false,
  quickAdd: null,

  setHydrated: () => set({ hydrated: true }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  openQuickAdd: (type) => set({ quickAdd: type, commandOpen: false }),
  closeQuickAdd: () => set({ quickAdd: null }),

  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined }
          : t
      ),
    })),

  addTask: (task) => {
    const newTask: Task = {
      id: uid("task"),
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
    return newTask;
  },

  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addEvent: (event) => {
    const newEvent: CalendarEvent = { ...event, id: uid("evt") };
    set((s) => ({ events: [...s.events, newEvent] }));
    return newEvent;
  },

  moveEvent: (id, date, startTime, endTime) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, date, startTime, endTime } : e)),
    })),

  updateEvent: (id, patch) =>
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  toggleHabit: (id, date) =>
    set((s) => {
      const day = date ?? todayISO();
      return {
        habits: s.habits.map((h) =>
          h.id === id ? { ...h, history: { ...h.history, [day]: !h.history[day] } } : h
        ),
      };
    }),

  addTransaction: (tx) =>
    set((s) => ({ transactions: [{ ...tx, id: uid("tx") }, ...s.transactions] })),

  addListItem: (listId, label) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, { id: uid("li"), label, done: false }] } : l
      ),
    })),

  toggleListItem: (listId, itemId) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          : l
      ),
    })),

  removeCheckedItems: (listId) =>
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => !i.done) } : l)),
    })),

  createList: (name, emoji = "📋") => {
    const newList: LifeList = { id: uid("list"), name, emoji, items: [], kind: "custom" };
    set((s) => ({ lists: [...s.lists, newList] }));
    return newList;
  },

  addGoal: (name) => {
    const goal: Goal = {
      id: uid("goal"),
      name,
      why: "",
      progress: 0,
      category: "personal",
      milestones: [],
      linkedTaskIds: [],
      linkedHabitIds: [],
      aiPlan: "LifeOS will suggest a plan once this goal has milestones and a deadline.",
    };
    set((s) => ({ goals: [...s.goals, goal] }));
    return goal;
  },

  updateGoal: (id, patch) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

  addMilestone: (goalId, title) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, milestones: [...g.milestones, { id: uid("m"), title, done: false }] } : g
      ),
    })),

  toggleMilestone: (goalId, milestoneId) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
            }
          : g
      ),
    })),

  toggleMemory: (id) =>
    set((s) => ({ memory: s.memory.map((m) => (m.id === id ? { ...m, active: !m.active } : m)) })),

  deleteMemory: (id) => set((s) => ({ memory: s.memory.filter((m) => m.id !== id) })),

  setMemoryEnabled: (enabled) =>
    set((s) => ({ profile: { ...s.profile, memoryEnabled: enabled } })),

  toggleAgent: (id) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, installed: true, active: !a.active } : a)),
    })),

  sendChatMessage: (text) => {
    const userMsg: ChatMessage = { id: uid("msg"), role: "user", content: text, createdAt: new Date().toISOString() };
    set((s) => ({ chat: [...s.chat, userMsg] }));

    const state = get();
    const reply = answerQuery(text, engineSnapshot(state));
    const aiMsg: ChatMessage = {
      id: uid("msg"),
      role: "ai",
      content: reply.content,
      createdAt: new Date().toISOString(),
      actions: reply.actions,
    };
    set((s) => ({ chat: [...s.chat, aiMsg] }));
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
      set((st) => ({
        chat: st.chat.map((m) =>
          m.id === messageId ? { ...m, actions: m.actions?.filter((a) => a.id !== action.id) } : m
        ),
      }));
    }
  },

  dismissAction: (actionId, messageId) => {
    if (messageId) {
      set((st) => ({
        chat: st.chat.map((m) =>
          m.id === messageId ? { ...m, actions: m.actions?.filter((a) => a.id !== actionId) } : m
        ),
      }));
    }
  },

  markNotificationRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

  addNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: uid("notif"), createdAt: new Date().toISOString(), read: false }, ...s.notifications],
    })),

  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  addDocument: (doc) =>
    set((s) => ({
      documents: [{ ...doc, id: uid("doc"), uploadedAt: new Date().toISOString().slice(0, 10) }, ...s.documents],
    })),
}));
