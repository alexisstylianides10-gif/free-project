/**
 * Deterministic reverse-tool mapping for the small set of create-type
 * tools with an obvious, safe inverse. Reversing an update or delete would
 * need snapshotting prior state — out of scope, so those simply have no
 * entry here and the Undo button won't render for them.
 */
export interface UndoMapping {
  deleteTool: string;
  /** Extracts the delete tool's args for each entity created — an array since some create tools (shopping_add_item) can create several at once. */
  extractDeleteArgs: (createResult: unknown) => Record<string, unknown>[];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export const UNDO_MAP: Record<string, UndoMapping> = {
  calendar_create: {
    deleteTool: "calendar_delete",
    extractDeleteArgs: (result) => {
      const id = asRecord(asRecord(result)?.event)?.id;
      return typeof id === "string" ? [{ eventId: id }] : [];
    },
  },
  tasks_create: {
    deleteTool: "tasks_delete",
    extractDeleteArgs: (result) => {
      const id = asRecord(asRecord(result)?.task)?.id;
      return typeof id === "string" ? [{ taskId: id }] : [];
    },
  },
  goals_create: {
    deleteTool: "goals_delete",
    extractDeleteArgs: (result) => {
      const id = asRecord(asRecord(result)?.goal)?.id;
      return typeof id === "string" ? [{ goalId: id }] : [];
    },
  },
  memory_create: {
    deleteTool: "memory_delete",
    extractDeleteArgs: (result) => {
      const id = asRecord(asRecord(result)?.memory)?.id;
      return typeof id === "string" ? [{ memoryId: id }] : [];
    },
  },
  shopping_add_item: {
    deleteTool: "shopping_remove_item",
    extractDeleteArgs: (result) => {
      const items = asRecord(result)?.items;
      if (!Array.isArray(items)) return [];
      return items.map((i) => ({ itemId: (asRecord(i)?.id as string) ?? "" })).filter((a) => a.itemId);
    },
  },
};
