import { CalendarEvent } from "./types";
import { addDaysISO, nextWeekday, todayISO } from "./utils";

export interface InterpretedCommand {
  label: string;
  detail: string;
  run: (ctx: CommandContext) => void;
}

export interface CommandContext {
  addEvent: (e: Omit<CalendarEvent, "id">) => void;
  addTask: (t: { title: string; dueDate?: string; priority?: "critical" | "high" | "medium" | "low" }) => void;
  addListItem: (listId: string, label: string) => void;
  createList: (name: string) => { id: string };
  findListId: (name: string) => string | undefined;
  navigate: (href: string) => void;
  openQuickAdd: (type: "task" | "event" | "note" | "document" | "expense" | "goal") => void;
}

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseTimeToHHMM(raw: string): string {
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return "09:00";
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const period = m[3]?.toLowerCase();
  if (period === "pm" && h < 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  if (!period && h < 8) h += 12; // assume afternoon for bare small numbers like "3"
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function resolveDate(raw: string): string {
  const today = todayISO();
  const lower = raw.toLowerCase();
  if (lower.includes("today")) return today;
  if (lower.includes("tomorrow")) return addDaysISO(today, 1);
  for (const [name, idx] of Object.entries(WEEKDAY_NAMES)) {
    if (lower.includes(name)) return nextWeekday(today, idx, true);
  }
  return today;
}

export function interpretCommand(raw: string): InterpretedCommand | null {
  const q = raw.trim();
  const lower = q.toLowerCase();
  if (!q) return null;

  // "Add <title> <weekday|today|tomorrow> at <time>"
  const eventMatch = lower.match(
    /^add (.+?) (today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)?\s*(?:at\s+([\d:apm\s]+))?$/
  );
  if (eventMatch && /at\s+[\d]/.test(lower)) {
    const title = eventMatch[1];
    const date = resolveDate(eventMatch[2] ?? "today");
    const time = parseTimeToHHMM(eventMatch[3] ?? "09:00");
    const [h, m] = time.split(":").map(Number);
    const endH = m + 45 >= 60 ? h + 1 : h;
    const endM = (m + 45) % 60;
    return {
      label: `Add "${cap(title)}" ${date === todayISO() ? "today" : ""}`,
      detail: `${date} at ${time}`,
      run: (ctx) =>
        ctx.addEvent({
          title: cap(title),
          date,
          startTime: time,
          endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
          type: "personal",
          movable: true,
        }),
    };
  }

  // "Add X and Y to my shopping list"
  const listMatch = lower.match(/add (.+) to (?:my |the )?(.+?) list/);
  if (listMatch) {
    const items = listMatch[1]
      .split(/,| and /)
      .map((s) => s.trim())
      .filter(Boolean);
    const listName = listMatch[2];
    return {
      label: `Add ${items.join(", ")} to ${cap(listName)} list`,
      detail: "Lists",
      run: (ctx) => {
        const id = ctx.findListId(listName) ?? ctx.createList(cap(listName)).id;
        items.forEach((item) => ctx.addListItem(id, cap(item)));
      },
    };
  }

  // "Create a goal to X"
  const goalMatch = lower.match(/create a goal to (.+)/);
  if (goalMatch) {
    return {
      label: `Create goal: ${cap(goalMatch[1])}`,
      detail: "Goals",
      run: (ctx) => ctx.openQuickAdd("goal"),
    };
  }

  if (/^show (my )?expenses|spending/.test(lower)) {
    return { label: "Show my spending", detail: "Finance", run: (ctx) => ctx.navigate("/finance") };
  }

  if (/^upload( a)? document/.test(lower)) {
    return { label: "Upload a document", detail: "Documents", run: (ctx) => ctx.openQuickAdd("document") };
  }

  if (/^plan (my day|tomorrow|today)/.test(lower)) {
    return { label: "Plan " + lower.replace("plan ", ""), detail: "Today", run: (ctx) => ctx.navigate("/today") };
  }

  return null;
}

function cap(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
