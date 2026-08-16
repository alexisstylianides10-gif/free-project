import { calendarTools } from "./calendar";
import { taskTools } from "./tasks";
import { memoryTools } from "./memory";
import { settingsTools } from "./settings";
import { conversationTools } from "./conversation";
import { shoppingTools } from "./shopping";
import { goalTools } from "./goals";
import { routineTools } from "./routines";
import { focusTools } from "./focus";
import { weeklyReviewTools } from "./weeklyReview";
import { documentTools } from "./documents";
import { planTools } from "./plan";
import { chatTools } from "./chat";
import type { ToolSpec } from "./types";

/**
 * The full tool registry the Head Agent can call. Adding a new agent means
 * adding a new tools/<agent>.ts file and listing it here — the Head Agent
 * itself never changes.
 */
export const allTools: ToolSpec<Record<string, unknown>>[] = [
  ...calendarTools,
  ...taskTools,
  ...memoryTools,
  ...settingsTools,
  ...conversationTools,
  ...shoppingTools,
  ...goalTools,
  ...routineTools,
  ...focusTools,
  ...weeklyReviewTools,
  ...documentTools,
  ...planTools,
  ...chatTools,
] as ToolSpec<Record<string, unknown>>[];

const byName = new Map(allTools.map((t) => [t.name, t]));

export function getTool(name: string): ToolSpec<Record<string, unknown>> | undefined {
  return byName.get(name);
}

export * from "./types";
