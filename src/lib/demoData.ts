import {
  Agent,
  Budget,
  CalendarEvent,
  Goal,
  Habit,
  LifeDocument,
  LifeList,
  MemoryItem,
  Profile,
  Subscription,
  Task,
  Transaction,
} from "./types";
import { addDaysISO, mulberry32, nextWeekday, todayISO } from "./utils";

// Deterministic ids (not Math.random-based `uid`) so server-rendered and
// client-hydrated demo data always match exactly — avoids hydration mismatches.
let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36).padStart(4, "0")}`;
}

const rand = mulberry32(20260731);
const TODAY = todayISO();
const FRIDAY = nextWeekday(TODAY, 5, true);
const WEDNESDAY = nextWeekday(TODAY, 3);
const TOMORROW = addDaysISO(TODAY, 1);

export const demoProfile: Profile = {
  name: "Alexis",
  email: "alexis.stylianides10@gmail.com",
  timezone: "Europe/Nicosia",
  location: "Limassol, Cyprus",
  avatarInitials: "A",
  plan: "Pro",
  proactivity: "balanced",
  theme: "system",
  memoryEnabled: true,
  notificationPrefs: { deadlines: true, financeAlerts: true, scheduleGaps: true, goalNudges: true },
};

export const demoTasks: Task[] = [
  {
    id: uid("task"),
    title: "Study for History exam",
    description: "Focus on the Cold War chapter and practice essay structure.",
    done: false,
    dueDate: FRIDAY,
    priority: "critical",
    estimatedMinutes: 90,
    category: "school",
    project: "History",
    subtasks: [
      { id: uid("sub"), title: "Review Cold War timeline", done: true },
      { id: uid("sub"), title: "Practice essay outline", done: false },
      { id: uid("sub"), title: "Redo past paper questions", done: false },
    ],
    aiContext: "Your closest upcoming deadline with the biggest grade impact.",
    createdAt: addDaysISO(TODAY, -6),
  },
  {
    id: uid("task"),
    title: "Math assignment",
    description: "Problem set 7 — derivatives and related rates.",
    done: false,
    dueDate: TOMORROW,
    priority: "high",
    estimatedMinutes: 45,
    category: "school",
    project: "Math",
    subtasks: [],
    createdAt: addDaysISO(TODAY, -2),
  },
  {
    id: uid("task"),
    title: "Finish project proposal",
    description: "Draft the two-page proposal for the group project.",
    done: false,
    dueDate: FRIDAY,
    priority: "medium",
    estimatedMinutes: 60,
    category: "school",
    project: "Group Project",
    subtasks: [],
    createdAt: addDaysISO(TODAY, -3),
  },
  {
    id: uid("task"),
    title: "Buy printer ink",
    done: false,
    dueDate: addDaysISO(TODAY, 3),
    priority: "low",
    estimatedMinutes: 10,
    category: "home",
    subtasks: [],
    aiContext: "Auto-categorized by Alxioum from your message.",
    createdAt: addDaysISO(TODAY, -1),
  },
  {
    id: uid("task"),
    title: "Pay electricity bill",
    done: false,
    dueDate: addDaysISO(TODAY, 5),
    priority: "medium",
    estimatedMinutes: 5,
    category: "finance",
    subtasks: [],
    createdAt: addDaysISO(TODAY, -4),
  },
  {
    id: uid("task"),
    title: "Clean room",
    done: false,
    dueDate: addDaysISO(TODAY, -2),
    priority: "low",
    estimatedMinutes: 20,
    category: "home",
    subtasks: [],
    createdAt: addDaysISO(TODAY, -8),
  },
  {
    id: uid("task"),
    title: "Pack tennis bag",
    done: false,
    dueDate: TODAY,
    priority: "low",
    estimatedMinutes: 5,
    category: "personal",
    goalId: "goal_tennis",
    subtasks: [],
    createdAt: TODAY,
  },
  {
    id: uid("task"),
    title: "Call dentist to confirm insurance",
    done: true,
    dueDate: addDaysISO(TODAY, -1),
    priority: "medium",
    category: "health",
    subtasks: [],
    createdAt: addDaysISO(TODAY, -3),
    completedAt: addDaysISO(TODAY, -1),
  },
  {
    id: uid("task"),
    title: "Read 20 pages",
    done: false,
    priority: "low",
    category: "personal",
    recurring: "daily",
    estimatedMinutes: 20,
    subtasks: [],
    createdAt: addDaysISO(TODAY, -14),
  },
];

// Deduped so a "school day" only gets one School block even when e.g. today
// happens to fall on the same date as the computed Friday/Wednesday.
const schoolDays = [...new Set([TODAY, TOMORROW, WEDNESDAY, FRIDAY])];

export const demoEvents: CalendarEvent[] = [
  ...schoolDays.map((date) => ({
    id: uid("evt"),
    title: "School",
    date,
    startTime: "08:00",
    endTime: "14:30",
    type: "school" as const,
    movable: false,
  })),

  { id: uid("evt"), title: "Lunch", date: TODAY, startTime: "12:30", endTime: "13:00", type: "personal", movable: false },
  { id: uid("evt"), title: "Dentist appointment", date: TODAY, startTime: "15:30", endTime: "16:15", type: "health", location: "Dr. Ioannou Clinic", movable: true },
  { id: uid("evt"), title: "Study History", date: TODAY, startTime: "16:30", endTime: "17:15", type: "study", aiGenerated: true, movable: true, linkedTaskId: undefined },
  { id: uid("evt"), title: "Break", date: TODAY, startTime: "17:15", endTime: "18:00", type: "personal", movable: true },
  { id: uid("evt"), title: "Tennis", date: TODAY, startTime: "18:00", endTime: "19:15", type: "personal", movable: true },
  { id: uid("evt"), title: "Dinner", date: TODAY, startTime: "20:30", endTime: "21:00", type: "personal", movable: false },

  ...(TOMORROW !== TODAY
    ? [{ id: uid("evt"), title: "Study Math", date: TOMORROW, startTime: "16:00", endTime: "16:45", type: "study" as const, aiGenerated: true, movable: true }]
    : []),

  ...(WEDNESDAY !== TODAY
    ? [{ id: uid("evt"), title: "Tennis practice", date: WEDNESDAY, startTime: "18:00", endTime: "19:00", type: "personal" as const, movable: true }]
    : []),

  { id: uid("evt"), title: "History exam", date: FRIDAY, startTime: "10:00", endTime: "11:00", type: "school", movable: false },
];

export const demoGoals: Goal[] = [
  {
    id: "goal_grades",
    name: "Improve my grades",
    why: "You want to get into a strong university program, and grades open doors.",
    progress: 48,
    deadline: addDaysISO(TODAY, 90),
    category: "school",
    milestones: [
      { id: uid("m"), title: "Build a consistent study routine", done: true },
      { id: uid("m"), title: "Raise History grade to a B+", done: false },
      { id: uid("m"), title: "Finish every assignment on time", done: false },
    ],
    linkedTaskIds: [],
    linkedHabitIds: [],
    aiPlan:
      "This week's focus should be your History exam on Friday — it's your closest deadline and the area with the most room to improve your grade.",
  },
  {
    id: "goal_tennis",
    name: "Improve my tennis",
    why: "You want to make the school team next season.",
    progress: 62,
    deadline: addDaysISO(TODAY, 60),
    category: "health",
    milestones: [
      { id: uid("m"), title: "Improve serve", done: true },
      { id: uid("m"), title: "Improve consistency", done: true },
      { id: uid("m"), title: "Improve footwork", done: false },
    ],
    linkedTaskIds: [],
    linkedHabitIds: [],
    aiPlan: "This week's focus should be serve consistency — use Wednesday's session to drill toss placement.",
  },
];

export const demoHabits: Habit[] = (() => {
  const defs: { name: string; emoji: string; target: number; base: number }[] = [
    { name: "Drink water", emoji: "💧", target: 7, base: 0.85 },
    { name: "Read", emoji: "📖", target: 5, base: 0.6 },
    { name: "Exercise", emoji: "🏃", target: 4, base: 0.55 },
    { name: "Study", emoji: "📚", target: 6, base: 0.7 },
    { name: "Sleep 8h", emoji: "🌙", target: 7, base: 0.5 },
  ];
  return defs.map((def, i) => {
    const history: Record<string, boolean> = {};
    let streak = 0;
    let best = 0;
    for (let d = -20; d <= 0; d++) {
      const iso = addDaysISO(TODAY, d);
      const done = d === 0 ? i < 4 : rand() < def.base;
      history[iso] = done;
      streak = done ? streak + 1 : 0;
      best = Math.max(best, streak);
    }
    return {
      id: uid("habit"),
      name: def.name,
      emoji: def.emoji,
      targetPerWeek: def.target,
      history,
      bestStreak: best,
      aiNote:
        def.name === "Study"
          ? "You're more consistent when you study before 6 PM."
          : undefined,
    };
  });
})();

export const demoTransactions: Transaction[] = [
  { id: uid("tx"), merchant: "Campus Café", amount: -4.5, date: TODAY, category: "Food" },
  { id: uid("tx"), merchant: "Bus pass top-up", amount: -20, date: addDaysISO(TODAY, -1), category: "Transport" },
  { id: uid("tx"), merchant: "Zara", amount: -38.9, date: addDaysISO(TODAY, -2), category: "Shopping" },
  { id: uid("tx"), merchant: "Netflix", amount: -9.99, date: addDaysISO(TODAY, -3), category: "Subscriptions" },
  { id: uid("tx"), merchant: "Spotify", amount: -5.99, date: addDaysISO(TODAY, -3), category: "Subscriptions" },
  { id: uid("tx"), merchant: "iCloud+", amount: -2.99, date: addDaysISO(TODAY, -3), category: "Subscriptions" },
  { id: uid("tx"), merchant: "Cinema", amount: -12, date: addDaysISO(TODAY, -4), category: "Entertainment" },
  { id: uid("tx"), merchant: "Souvlaki House", amount: -8.5, date: addDaysISO(TODAY, -5), category: "Food" },
  { id: uid("tx"), merchant: "School supplies", amount: -14.3, date: addDaysISO(TODAY, -6), category: "School" },
  { id: uid("tx"), merchant: "Allowance", amount: 150, date: addDaysISO(TODAY, -7), category: "Other" },
  { id: uid("tx"), merchant: "Grocery run", amount: -22.1, date: addDaysISO(TODAY, -8), category: "Food" },
  { id: uid("tx"), merchant: "Tennis court fee", amount: -15, date: addDaysISO(TODAY, -9), category: "Entertainment" },
];

export const demoSubscriptions: Subscription[] = [
  { id: uid("sub"), name: "Netflix", amount: 9.99, renewsOn: addDaysISO(TODAY, 27), category: "Subscriptions" },
  { id: uid("sub"), name: "Spotify", amount: 5.99, renewsOn: addDaysISO(TODAY, 27), category: "Subscriptions" },
  { id: uid("sub"), name: "iCloud+", amount: 2.99, renewsOn: addDaysISO(TODAY, 12), category: "Subscriptions" },
];

export const demoBudgets: Budget[] = [
  { category: "Food", limit: 80 },
  { category: "Transport", limit: 40 },
  { category: "Shopping", limit: 60 },
  { category: "Entertainment", limit: 40 },
  { category: "Subscriptions", limit: 25 },
  { category: "School", limit: 30 },
];

export const demoDocuments: LifeDocument[] = [
  {
    id: uid("doc"),
    name: "School Term Calendar.pdf",
    kind: "pdf",
    folder: "School",
    tags: ["school", "dates"],
    sizeKb: 420,
    uploadedAt: addDaysISO(TODAY, -10),
    aiSummary: "Term calendar with exam windows, half-term breaks, and the school trip in October.",
    extractedDates: [
      { label: "History exam", date: FRIDAY },
      { label: "Half-term break begins", date: addDaysISO(TODAY, 21) },
    ],
  },
  {
    id: uid("doc"),
    name: "Laptop Warranty.pdf",
    kind: "pdf",
    folder: "Home",
    tags: ["warranty", "receipts"],
    sizeKb: 180,
    uploadedAt: addDaysISO(TODAY, -40),
    aiSummary: "Extended warranty for your laptop, covers hardware defects.",
    extractedDates: [{ label: "Warranty expires", date: addDaysISO(TODAY, 620) }],
  },
  {
    id: uid("doc"),
    name: "Tennis Club Membership.docx",
    kind: "docx",
    folder: "Personal",
    tags: ["tennis", "membership"],
    sizeKb: 90,
    uploadedAt: addDaysISO(TODAY, -60),
  },
];

export const demoLists: LifeList[] = [
  {
    id: uid("list"),
    name: "Shopping",
    emoji: "🛒",
    kind: "shopping",
    items: [
      { id: uid("li"), label: "Milk", done: false },
      { id: uid("li"), label: "Printer ink", done: false },
      { id: uid("li"), label: "Notebooks", done: true },
      { id: uid("li"), label: "Tennis grip tape", done: false },
    ],
  },
  {
    id: uid("list"),
    name: "Packing — Hong Kong",
    emoji: "🧳",
    kind: "packing",
    items: [
      { id: uid("li"), label: "Passport", done: true },
      { id: uid("li"), label: "Charger", done: false },
      { id: uid("li"), label: "Adapter", done: false },
    ],
  },
  {
    id: uid("list"),
    name: "Wishlist",
    emoji: "✨",
    kind: "wishlist",
    items: [
      { id: uid("li"), label: "Noise-cancelling headphones", done: false },
      { id: uid("li"), label: "New tennis racket", done: false },
    ],
  },
];

export const demoMemory: MemoryItem[] = [
  {
    id: uid("mem"),
    category: "Preferences",
    content: "Prefers studying in the afternoon, before 6 PM.",
    reason: "Noticed from 3 weeks of completed study sessions.",
    source: "Pattern detected from Habits + Today",
    createdAt: addDaysISO(TODAY, -12),
    active: true,
  },
  {
    id: uid("mem"),
    category: "Routines",
    content: "Plays tennis on Wednesday evenings.",
    reason: "Recurring calendar event.",
    source: "Calendar",
    createdAt: addDaysISO(TODAY, -30),
    active: true,
  },
  {
    id: uid("mem"),
    category: "Important dates",
    content: "History exam is this Friday.",
    reason: "Added from School Term Calendar.pdf.",
    source: "Documents",
    createdAt: addDaysISO(TODAY, -10),
    active: true,
  },
  {
    id: uid("mem"),
    category: "Goals",
    content: "Wants to make the school tennis team next season.",
    reason: "Stated as the reason behind the 'Improve my tennis' goal.",
    source: "Goals",
    createdAt: addDaysISO(TODAY, -25),
    active: true,
  },
  {
    id: uid("mem"),
    category: "People",
    content: "Dentist is Dr. Ioannou.",
    reason: "Mentioned in a calendar event location.",
    source: "Calendar",
    createdAt: addDaysISO(TODAY, -5),
    active: true,
  },
  {
    id: uid("mem"),
    category: "Past decisions",
    content: "Chose to move study sessions earlier after ignoring 7 AM reminders.",
    reason: "You dismissed 4 early-morning reminders in a row.",
    source: "Notifications",
    createdAt: addDaysISO(TODAY, -8),
    active: true,
  },
];

export const demoAgents: Agent[] = [
  {
    id: "agent_daily_planner",
    name: "Daily Planner",
    description: "Builds your recommended schedule every morning from your calendar, tasks, goals, and habits.",
    category: "Productivity",
    capabilities: [
      "Reads your calendar, tasks, deadlines, goals, and habits",
      "Finds conflicts and free time",
      "Creates a recommended schedule for the day",
    ],
    permissions: ["Read calendar", "Read tasks", "Read goals", "Read habits", "Propose calendar events"],
    connectedServices: ["Calendar", "Tasks", "Goals", "Habits"],
    installed: true,
    active: true,
    runHistory: [
      { id: uid("run"), ranAt: TODAY + "T07:00", summary: "Built today's plan around your History exam prep and tennis.", status: "success" },
      { id: uid("run"), ranAt: addDaysISO(TODAY, -1) + "T07:00", summary: "Built yesterday's plan. You edited the study block.", status: "success" },
    ],
    icon: "CalendarClock",
  },
  {
    id: "agent_study_planner",
    name: "Study Planner",
    description: "Breaks upcoming exams and assignments into study sessions that fit your free time.",
    category: "School",
    capabilities: ["Reads upcoming deadlines", "Splits study time into focused sessions", "Proposes calendar blocks"],
    permissions: ["Read tasks", "Read calendar", "Propose calendar events"],
    connectedServices: ["Tasks", "Calendar"],
    installed: true,
    active: true,
    runHistory: [
      { id: uid("run"), ranAt: addDaysISO(TODAY, -2) + "T18:00", summary: "Scheduled two History study sessions before Friday's exam.", status: "success" },
    ],
    icon: "GraduationCap",
  },
  {
    id: "agent_expense_organizer",
    name: "Expense Organizer",
    description: "Categorizes new transactions and flags unusual spending.",
    category: "Finance",
    capabilities: ["Reads transactions", "Categorizes spending", "Flags budget overruns"],
    permissions: ["Read transactions", "Read budgets"],
    connectedServices: ["Finance"],
    installed: true,
    active: false,
    runHistory: [],
    icon: "PiggyBank",
  },
  {
    id: "agent_document_assistant",
    name: "Document Assistant",
    description: "Reads uploaded documents and extracts dates, deadlines, and key information.",
    category: "Personal",
    capabilities: ["Summarizes documents", "Extracts dates", "Suggests reminders and tasks"],
    permissions: ["Read documents", "Propose calendar events", "Propose tasks"],
    connectedServices: ["Documents"],
    installed: true,
    active: true,
    runHistory: [
      { id: uid("run"), ranAt: addDaysISO(TODAY, -10) + "T09:12", summary: "Found 2 important dates in School Term Calendar.pdf.", status: "success" },
    ],
    icon: "FileSearch",
  },
  {
    id: "agent_travel_planner",
    name: "Travel Planner",
    description: "Builds itineraries and packing lists for upcoming trips.",
    category: "Travel",
    capabilities: ["Builds itineraries", "Creates packing lists", "Tracks travel documents"],
    permissions: ["Read calendar", "Propose lists", "Propose tasks"],
    connectedServices: ["Calendar", "Lists"],
    installed: false,
    active: false,
    runHistory: [],
    icon: "Plane",
  },
  {
    id: "agent_email_assistant",
    name: "Email Assistant",
    description: "Drafts replies and surfaces emails that need action.",
    category: "Communication",
    capabilities: ["Reads inbox", "Drafts replies", "Flags action items"],
    permissions: ["Read email", "Draft email"],
    connectedServices: ["Email (not connected)"],
    installed: false,
    active: false,
    runHistory: [],
    icon: "Mail",
  },
  {
    id: "agent_research_agent",
    name: "Research Agent",
    description: "Gathers and summarizes information on a topic you're working on.",
    category: "Productivity",
    capabilities: ["Searches connected documents", "Summarizes findings", "Drafts notes"],
    permissions: ["Read documents", "Propose documents"],
    connectedServices: ["Documents"],
    installed: false,
    active: false,
    runHistory: [],
    icon: "Search",
  },
  {
    id: "agent_shopping_assistant",
    name: "Shopping Assistant",
    description: "Keeps shopping lists tidy and reminds you before you run out of essentials.",
    category: "Shopping",
    capabilities: ["Reads lists", "Adds items from conversation", "Suggests reorders"],
    permissions: ["Read lists", "Edit lists"],
    connectedServices: ["Lists"],
    installed: false,
    active: false,
    runHistory: [],
    icon: "ShoppingCart",
  },
];

export const TODAY_ISO = TODAY;
export const FRIDAY_ISO = FRIDAY;
export const WEDNESDAY_ISO = WEDNESDAY;
export const TOMORROW_ISO = TOMORROW;
