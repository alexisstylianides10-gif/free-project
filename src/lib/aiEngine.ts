import {
  CalendarEvent,
  Goal,
  Habit,
  LifeList,
  MemoryItem,
  PendingAction,
  Task,
  Transaction,
} from "./types";
import {
  addDaysISO,
  daysBetween,
  formatMoney,
  formatTime12,
  priorityWeight,
  todayISO,
  uid,
} from "./utils";

export interface BriefingItem {
  id: string;
  emoji: "🔴" | "🟠" | "🟡";
  title: string;
  subtitle: string;
  taskId?: string;
}

export interface Recommendation {
  id: string;
  text: string;
  action?: PendingAction;
}

export interface EngineState {
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  habits: Habit[];
  transactions: Transaction[];
  lists: LifeList[];
  memory: MemoryItem[];
}

function urgencyEmoji(daysLeft: number, priority: string): "🔴" | "🟠" | "🟡" {
  if (daysLeft <= 0 || priority === "critical") return "🔴";
  if (daysLeft <= 2 || priority === "high") return "🟠";
  return "🟡";
}

/** Ranks open tasks/events for "what matters today" — closer deadline + higher priority + goal-linked wins. */
export function rankTasks(tasks: Task[]): Task[] {
  const today = todayISO();
  return [...tasks]
    .filter((t) => !t.done)
    .sort((a, b) => {
      const aDays = a.dueDate ? daysBetween(today, a.dueDate) : 999;
      const bDays = b.dueDate ? daysBetween(today, b.dueDate) : 999;
      const aScore = priorityWeight(a.priority) * 10 - aDays + (a.goalId ? 2 : 0);
      const bScore = priorityWeight(b.priority) * 10 - bDays + (b.goalId ? 2 : 0);
      return bScore - aScore;
    });
}

export function generateDailyBriefing(state: EngineState): BriefingItem[] {
  const today = todayISO();
  const ranked = rankTasks(state.tasks).filter((t) => {
    if (!t.dueDate) return false;
    const days = daysBetween(today, t.dueDate);
    return days <= 4;
  });

  const todaysEvents = state.events.filter(
    (e) => e.date === today && (e.type === "health" || e.type === "school") === false
  );

  const items: BriefingItem[] = ranked.slice(0, 3).map((t) => {
    const days = t.dueDate ? daysBetween(today, t.dueDate) : 0;
    const subtitle =
      days < 0 ? `Overdue by ${Math.abs(days)}d` : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due ${new Date(t.dueDate! + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}`;
    return {
      id: t.id,
      emoji: urgencyEmoji(days, t.priority),
      title: t.title,
      subtitle,
      taskId: t.id,
    };
  });

  // Fold in a same-day appointment if there's room and it isn't already represented.
  const appt = state.events.find((e) => e.date === today && e.type === "health");
  if (appt && items.length < 3) {
    items.push({
      id: appt.id,
      emoji: "🟠",
      title: appt.title,
      subtitle: formatTime12(appt.startTime),
    });
  }

  void todaysEvents;
  return items.slice(0, 3);
}

export interface FreeSlot {
  date: string;
  start: string;
  end: string;
  minutes: number;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const DAY_START = toMinutes("07:30");
const DAY_END = toMinutes("22:00");

export function findFreeSlots(events: CalendarEvent[], date: string, minMinutes = 30): FreeSlot[] {
  const dayEvents = events
    .filter((e) => e.date === date)
    .map((e) => [toMinutes(e.startTime), toMinutes(e.endTime)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const slots: FreeSlot[] = [];
  let cursor = DAY_START;
  for (const [start, end] of dayEvents) {
    if (start - cursor >= minMinutes) {
      slots.push({ date, start: toHHMM(cursor), end: toHHMM(start), minutes: start - cursor });
    }
    cursor = Math.max(cursor, end);
  }
  if (DAY_END - cursor >= minMinutes) {
    slots.push({ date, start: toHHMM(cursor), end: toHHMM(DAY_END), minutes: DAY_END - cursor });
  }
  return slots;
}

export function generateRecommendation(state: EngineState): Recommendation | null {
  const today = todayISO();
  const priorityTask = rankTasks(state.tasks).find((t) => t.dueDate && daysBetween(today, t.dueDate) <= 3);
  if (!priorityTask) return null;

  const slots = findFreeSlots(state.events, today, 30).sort((a, b) => b.minutes - a.minutes);
  const best = slots[0];
  if (!best) return null;

  const useMinutes = Math.min(best.minutes, priorityTask.estimatedMinutes ?? 45);
  const endMinutes = toMinutes(best.start) + useMinutes;
  const end = toHHMM(endMinutes);

  const gapLabel =
    best.minutes >= 60
      ? `${Math.floor(best.minutes / 60)} hour${best.minutes >= 120 ? "s" : ""}${best.minutes % 60 ? ` ${best.minutes % 60} min` : ""}`
      : `${best.minutes} minutes`;

  return {
    id: uid("rec"),
    text: `You have ${gapLabel} free at ${formatTime12(best.start)}. I'd use ${useMinutes} minutes for "${priorityTask.title}" because it's your highest-priority upcoming deadline.`,
    action: {
      id: uid("act"),
      kind: "create_event",
      title: `Schedule "${priorityTask.title}"`,
      detail: `${formatTime12(best.start)}–${formatTime12(end)} today`,
      payload: {
        title: priorityTask.title,
        date: today,
        startTime: best.start,
        endTime: end,
        type: "study",
        linkedTaskId: priorityTask.id,
      },
      createdAt: new Date().toISOString(),
    },
  };
}

export interface AIReply {
  content: string;
  actions: PendingAction[];
}

function listByName(lists: LifeList[], name: string): LifeList | undefined {
  const lower = name.toLowerCase();
  return lists.find((l) => l.name.toLowerCase().includes(lower));
}

export function answerQuery(query: string, state: EngineState): AIReply {
  const q = query.trim().toLowerCase();
  const today = todayISO();

  // "Add X and Y to my shopping list"
  const addToList = q.match(/add (.+) to (?:my |the )?(.+?) list/);
  if (addToList) {
    const itemsRaw = addToList[1];
    const listName = addToList[2];
    const target = listByName(state.lists, listName);
    const items = itemsRaw
      .split(/,| and /)
      .map((s) => s.trim())
      .filter(Boolean);
    if (target) {
      return {
        content: `I'll add ${items.join(", ")} to your "${target.name}" list.`,
        actions: items.map((item) => ({
          id: uid("act"),
          kind: "add_list_item",
          title: `Add "${item}" to ${target.name}`,
          detail: target.name,
          payload: { listId: target.id, label: item },
          createdAt: new Date().toISOString(),
        })),
      };
    }
    return {
      content: `I couldn't find a "${listName}" list yet. Want me to create one?`,
      actions: [],
    };
  }

  // "Create a packing list for X"
  const createList = q.match(/create a (.+) list(?: for (.+))?/);
  if (createList) {
    const kindWord = createList[1];
    const subject = createList[2];
    const name = subject ? `${cap(kindWord)} — ${cap(subject)}` : cap(kindWord);
    return {
      content: `I'll create a new list called "${name}".`,
      actions: [
        {
          id: uid("act"),
          kind: "add_list_item",
          title: `Create list "${name}"`,
          detail: "New list",
          payload: { createList: true, name },
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  // Spending
  if (/spen|expense/.test(q)) {
    const month = new Date().getMonth();
    const monthTx = state.transactions.filter((t) => new Date(t.date + "T00:00:00").getMonth() === month && t.amount < 0);
    const total = monthTx.reduce((s, t) => s + Math.abs(t.amount), 0);
    const byCategory = new Map<string, number>();
    for (const t of monthTx) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Math.abs(t.amount));
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      content: `You've spent ${formatMoney(total)} this month across ${monthTx.length} transactions. Your biggest category is ${top?.[0] ?? "—"} at ${formatMoney(top?.[1] ?? 0)}.`,
      actions: [],
    };
  }

  // "Schedule N hours to study this week" / "find time to study"
  if (/study|find (me )?time|free time/.test(q)) {
    const studyTask = rankTasks(state.tasks).find((t) => t.category === "school" && t.dueDate);
    const hoursMatch = q.match(/(\d+)\s*hour/);
    const wantMinutes = hoursMatch ? Number(hoursMatch[1]) * 60 : 60;

    const candidates: { date: string; slot: ReturnType<typeof findFreeSlots>[number] }[] = [];
    for (let d = 0; d < 5 && candidates.length < 2; d++) {
      const date = addDaysISO(today, d);
      const slots = findFreeSlots(state.events, date, Math.min(45, wantMinutes)).sort((a, b) => b.minutes - a.minutes);
      if (slots[0]) candidates.push({ date, slot: slots[0] });
    }

    if (candidates.length === 0) {
      return { content: "Your next few days look fully booked — I couldn't find open time.", actions: [] };
    }

    const lines = candidates
      .map((c) => {
        const useMin = Math.min(c.slot.minutes, wantMinutes / candidates.length);
        const endM = toMinutes(c.slot.start) + useMin;
        return `${dayLabel(c.date)} ${formatTime12(c.slot.start)}–${formatTime12(toHHMM(endM))}`;
      })
      .join("\n");

    const examNote = studyTask?.dueDate
      ? ` Your ${studyTask.title.toLowerCase()} is due ${dayLabel(studyTask.dueDate)}, so I recommend these.`
      : "";

    return {
      content: `I found ${candidates.length === 1 ? "one available period" : "two available periods"}:\n${lines}.${examNote}`,
      actions: candidates.map((c) => {
        const useMin = Math.min(c.slot.minutes, wantMinutes / candidates.length);
        const endM = toMinutes(c.slot.start) + useMin;
        return {
          id: uid("act"),
          kind: "create_event",
          title: `Study session — ${dayLabel(c.date)}`,
          detail: `${formatTime12(c.slot.start)}–${formatTime12(toHHMM(endM))}`,
          payload: {
            title: studyTask ? `Study ${studyTask.project ?? studyTask.title}` : "Study session",
            date: c.date,
            startTime: c.slot.start,
            endTime: toHHMM(endM),
            type: "study",
            linkedTaskId: studyTask?.id,
          },
          createdAt: new Date().toISOString(),
        };
      }),
    };
  }

  // "What am I forgetting?"
  if (/forgetting|missing|overlooked/.test(q)) {
    const overdue = state.tasks.filter((t) => !t.done && t.dueDate && daysBetween(today, t.dueDate) < 0);
    const staleGoals = state.goals.filter((g) => !g.archived && g.progress < 100);
    const parts: string[] = [];
    if (overdue.length) parts.push(`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}: ${overdue.map((t) => t.title).join(", ")}.`);
    if (staleGoals.length) parts.push(`Your goal "${staleGoals[0].name}" could use attention this week.`);
    if (!parts.length) return { content: "Nothing urgent is slipping — you're on top of things.", actions: [] };
    return { content: parts.join(" "), actions: [] };
  }

  // "Help me achieve my goals" / goals
  if (/goal/.test(q)) {
    if (!state.goals.length) return { content: "You don't have any active goals yet. Want to create one?", actions: [] };
    const lines = state.goals.map((g) => `"${g.name}" (${g.progress}%): ${g.aiPlan}`).join("\n\n");
    return { content: lines, actions: [] };
  }

  // "What should I prioritize" / "plan my day"
  if (/priorit|plan my day|what.*(do|need).*(today|this week)/.test(q)) {
    const ranked = rankTasks(state.tasks).filter((t) => !t.dueDate || daysBetween(today, t.dueDate) <= 7);
    if (!ranked.length) return { content: "Nothing pressing this week — a good time to get ahead on your goals.", actions: [] };
    const lines = ranked
      .slice(0, 5)
      .map((t, i) => `${i + 1}. ${t.title}${t.dueDate ? ` — ${dayLabel(t.dueDate)}` : ""}`)
      .join("\n");
    return {
      content: `Here's what matters most:\n${lines}`,
      actions: [],
    };
  }

  return {
    content:
      "I looked through your tasks, calendar, and goals but didn't find a specific match for that yet. Try asking me to plan your day, find study time, or check your spending.",
    actions: [],
  };
}

function cap(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function dayLabel(iso: string): string {
  const days = daysBetween(todayISO(), iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
}

export function computeInsights(state: EngineState): { title: string; body: string }[] {
  const today = todayISO();
  const insights: { title: string; body: string }[] = [];

  const upcoming7 = state.tasks.filter((t) => !t.done && t.dueDate && daysBetween(today, t.dueDate) <= 7 && daysBetween(today, t.dueDate) >= 0);
  if (upcoming7.length) {
    insights.push({
      title: "Upcoming pressure",
      body: `You have ${upcoming7.length} deadline${upcoming7.length > 1 ? "s" : ""} in the next 7 days.`,
    });
  }

  const completedByHour = state.tasks.filter((t) => t.completedAt);
  if (completedByHour.length >= 2) {
    insights.push({
      title: "Productivity pattern",
      body: "You tend to complete tasks more often earlier in the day.",
    });
  }

  const staleGoal = state.goals.find((g) => g.progress < 70);
  if (staleGoal) {
    insights.push({
      title: "Goal momentum",
      body: `Keep momentum on "${staleGoal.name}" — it's at ${staleGoal.progress}%.`,
    });
  }

  const studyHabit = state.habits.find((h) => h.name === "Study");
  if (studyHabit) {
    const last7 = Object.entries(studyHabit.history)
      .filter(([d]) => daysBetween(d, today) < 7 && daysBetween(d, today) >= 0)
      .filter(([, v]) => v).length;
    insights.push({
      title: "Habit consistency",
      body: `You completed your study habit ${last7} day${last7 === 1 ? "" : "s"} this week.${studyHabit.aiNote ? ` ${studyHabit.aiNote}` : ""}`,
    });
  }

  return insights;
}
