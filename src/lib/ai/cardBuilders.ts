import type { ResponseCard } from "./cards";
import type { GoalStatus } from "@/lib/types";

interface RawEventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
}

function eventFromRawRow(e: RawEventRow) {
  return { id: e.id, title: e.title, date: e.date, startTime: e.start_time, endTime: e.end_time, location: e.location ?? null };
}

interface RawTaskRow {
  id: string;
  title: string;
  due_date: string | null;
  priority?: string;
  done: boolean;
}

function taskFromRawRow(t: RawTaskRow) {
  return { id: t.id, title: t.title, dueDate: t.due_date, priority: t.priority, done: t.done };
}

/**
 * Maps a tool's name + its raw execute() result into zero or more display
 * cards. Pure/synchronous — no DB access here, only reshaping data the tool
 * already fetched. Only tools with an obvious, spec-relevant card get one;
 * everything else just renders as prose (unchanged behavior).
 */
export function buildCardsForTool(toolName: string, result: unknown): ResponseCard[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;

  switch (toolName) {
    case "calendar_search": {
      const events = Array.isArray(r.events) ? (r.events as { id: string; title: string; date: string; startTime: string; endTime: string; location?: string | null }[]) : [];
      if (events.length === 0) return [];
      return [{ type: "event", events }];
    }
    case "calendar_create":
    case "calendar_update": {
      const event = r.event as RawEventRow | undefined;
      if (!event) return [];
      return [{ type: "event", events: [eventFromRawRow(event)] }];
    }

    case "tasks_search": {
      const tasks = Array.isArray(r.tasks) ? (r.tasks as { id: string; title: string; dueDate?: string | null; priority?: string; done: boolean }[]) : [];
      if (tasks.length === 0) return [];
      return [{ type: "taskList", tasks }];
    }
    case "tasks_create": {
      const task = r.task as RawTaskRow | undefined;
      if (!task) return [];
      return [{ type: "taskList", tasks: [taskFromRawRow(task)] }];
    }

    case "goals_search": {
      const goals = Array.isArray(r.goals)
        ? (r.goals as { id: string; name: string; icon: string; progress: number; status: GoalStatus; nextMilestone: string | null; targetDate: string | null }[])
        : [];
      if (goals.length === 0) return [];
      return [
        {
          type: "goalProgress",
          goals: goals.map((g) => ({ id: g.id, name: g.name, icon: g.icon, progressPct: g.progress, status: g.status, nextMilestone: g.nextMilestone, targetDate: g.targetDate })),
        },
      ];
    }

    case "documents_search": {
      const documents = Array.isArray(r.documents) ? (r.documents as { id: string; name: string; mimeType: string; summary: string; category?: string | null }[]) : [];
      if (documents.length === 0) return [];
      return [{ type: "document", documents: documents.map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType, summary: d.summary, category: d.category ?? null, nearestDeadline: null })) }];
    }
    case "documents_read": {
      const id = r.id as string | undefined;
      const name = r.name as string | undefined;
      if (!id || !name) return [];
      const dates = Array.isArray(r.dates) ? (r.dates as { label: string; date: string }[]) : [];
      const nearestDeadline = dates.length
        ? dates.reduce((earliest, d) => (!earliest || d.date < earliest.date ? d : earliest), null as { label: string; date: string } | null)
        : null;
      return [
        {
          type: "document",
          documents: [
            { id, name, mimeType: (r.mimeType as string) ?? "application/octet-stream", summary: (r.summary as string) ?? "", category: (r.category as string | null) ?? null, nearestDeadline },
          ],
        },
      ];
    }

    case "shopping_search": {
      const items = Array.isArray(r.items) ? (r.items as { id: string; name: string; quantity?: string | null; done: boolean }[]) : [];
      const openItems = items.filter((i) => !i.done);
      if (openItems.length === 0) return [];
      return [{ type: "shoppingList", items: openItems }];
    }

    case "daily_briefing_get": {
      return [
        {
          type: "dailyBriefing",
          briefing: {
            eventsCount: (r.eventsCount as number) ?? 0,
            tasksRemaining: (r.tasksRemaining as number) ?? 0,
            goalsPriorityCount: (r.goalsPriorityCount as number) ?? 0,
            deadlinesUpcoming: (r.deadlinesUpcoming as number) ?? 0,
            recommendedFocus: (r.recommendedFocus as string | null) ?? null,
          },
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * Builds a preview card from a PROPOSED action's args (before anything is
 * created) — a different shape from a tool's execute() result, since
 * nothing has an id yet. Only covers tools whose args already carry
 * everything needed for an honest preview (calendar_create/update,
 * tasks_create, and plan_organize_day's bundle); other consequential tools
 * keep relying on their existing describe() text summary, which already
 * names what's involved.
 */
export function buildPreviewCards(toolName: string, args: unknown): ResponseCard[] {
  if (!args || typeof args !== "object") return [];
  const a = args as Record<string, unknown>;

  switch (toolName) {
    case "calendar_create":
    case "calendar_update": {
      if (!a.title && !a.date) return [];
      return [
        {
          type: "event",
          events: [
            {
              id: "preview",
              title: (a.title as string) ?? "Untitled event",
              date: (a.date as string) ?? "",
              startTime: (a.startTime as string) ?? "",
              endTime: (a.endTime as string) ?? "",
              location: (a.location as string | null) ?? null,
            },
          ],
        },
      ];
    }
    case "tasks_create": {
      if (!a.title) return [];
      return [{ type: "taskList", tasks: [{ id: "preview", title: a.title as string, dueDate: (a.dueDate as string | null) ?? null, priority: a.priority as string | undefined, done: false }] }];
    }
    case "plan_organize_day": {
      const cards: ResponseCard[] = [];
      const events = Array.isArray(a.events) ? (a.events as { title: string; date: string; startTime: string; endTime: string; location?: string | null }[]) : [];
      const tasks = Array.isArray(a.tasks) ? (a.tasks as { title: string; dueDate?: string; priority?: string }[]) : [];
      if (events.length) {
        cards.push({ type: "event", events: events.map((e, i) => ({ id: `preview-e${i}`, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, location: e.location ?? null })) });
      }
      if (tasks.length) {
        cards.push({ type: "taskList", tasks: tasks.map((t, i) => ({ id: `preview-t${i}`, title: t.title, dueDate: t.dueDate ?? null, priority: t.priority, done: false })) });
      }
      return cards;
    }
    default:
      return [];
  }
}
