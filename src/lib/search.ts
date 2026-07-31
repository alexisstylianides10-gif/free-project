import {
  CalendarEvent,
  Goal,
  LifeDocument,
  LifeList,
  MemoryItem,
  Task,
} from "./types";
import { formatDayLabel } from "./utils";

export interface SearchResult {
  id: string;
  type: "Task" | "Calendar event" | "Document" | "Goal" | "Memory" | "List";
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchIndex {
  tasks: Task[];
  events: CalendarEvent[];
  documents: LifeDocument[];
  goals: Goal[];
  memory: MemoryItem[];
  lists: LifeList[];
}

export function searchAll(query: string, idx: SearchIndex): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const t of idx.tasks) {
    if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
      results.push({
        id: t.id,
        type: "Task",
        title: t.title,
        subtitle: t.dueDate ? `Due ${formatDayLabel(t.dueDate)}` : "No due date",
        href: "/tasks",
      });
    }
  }

  for (const e of idx.events) {
    if (e.title.toLowerCase().includes(q)) {
      results.push({
        id: e.id,
        type: "Calendar event",
        title: e.title,
        subtitle: `${formatDayLabel(e.date)} · ${e.startTime}`,
        href: "/calendar",
      });
    }
  }

  for (const d of idx.documents) {
    if (d.name.toLowerCase().includes(q) || d.tags.some((t) => t.includes(q))) {
      results.push({ id: d.id, type: "Document", title: d.name, subtitle: d.folder, href: "/documents" });
    }
  }

  for (const g of idx.goals) {
    if (g.name.toLowerCase().includes(q)) {
      results.push({ id: g.id, type: "Goal", title: g.name, subtitle: `${g.progress}% complete`, href: "/goals" });
    }
  }

  for (const m of idx.memory) {
    if (m.content.toLowerCase().includes(q)) {
      results.push({ id: m.id, type: "Memory", title: m.content, subtitle: m.category, href: "/memory" });
    }
  }

  for (const l of idx.lists) {
    if (l.name.toLowerCase().includes(q) || l.items.some((i) => i.label.toLowerCase().includes(q))) {
      results.push({ id: l.id, type: "List", title: l.name, subtitle: `${l.items.length} items`, href: "/lists" });
    }
  }

  return results.slice(0, 20);
}
