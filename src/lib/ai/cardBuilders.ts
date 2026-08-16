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

    default:
      return [];
  }
}
