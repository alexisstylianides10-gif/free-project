import { differenceInCalendarDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Goal, GoalMilestone, GoalAction, GoalActionLog, GoalStatus } from "@/lib/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Progress % is always derived from real data — never AI-assigned.
 * checklist goals derive from milestone completion; every other measurement
 * type derives from current/target.
 */
export function computeProgressPct(goal: Goal, milestones: GoalMilestone[]): number {
  if (goal.completed) return 100;
  if (goal.measurementType === "checklist") {
    if (milestones.length === 0) return clamp(Math.round(goal.progress), 0, 100);
    const done = milestones.filter((m) => m.done).length;
    return clamp(Math.round((done / milestones.length) * 100), 0, 100);
  }
  const target = goal.measurementTarget;
  if (!target || target <= 0) return clamp(Math.round(goal.progress), 0, 100);
  return clamp(Math.round((goal.measurementCurrent / target) * 100), 0, 100);
}

/** Ratio (0-1) of this week's planned goal_actions that have a log entry, or null if no actions are defined. */
export function weeklyActionCompletionRatio(
  actions: GoalAction[],
  actionLogs: GoalActionLog[],
  today: Date = new Date()
): number | null {
  if (actions.length === 0) return null;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const actionIds = new Set(actions.map((a) => a.id));
  const logsThisWeek = actionLogs.filter(
    (l) => actionIds.has(l.goalActionId) && isWithinInterval(new Date(l.logDate), { start: weekStart, end: weekEnd })
  );
  const planned = actions.reduce((sum, a) => sum + a.frequencyPerWeek, 0);
  if (planned === 0) return null;
  return clamp(logsThisWeek.length / planned, 0, 1);
}

/**
 * Status is always computed from real progress/time/action data — never
 * randomly assigned and never trusted directly from the AI. Paused/completed
 * are the only persisted states; everything else is derived here.
 */
export function computeGoalStatus(
  goal: Goal,
  milestones: GoalMilestone[],
  actions: GoalAction[],
  actionLogs: GoalActionLog[],
  today: Date = new Date()
): GoalStatus {
  if (goal.completed) return "completed";
  if (goal.paused) return "paused";

  const progressPct = computeProgressPct(goal, milestones);
  if (progressPct >= 100) return "completed";

  let paceScore: number | null = null;
  if (goal.targetDate) {
    const totalDays = differenceInCalendarDays(new Date(goal.targetDate), new Date(goal.createdAt));
    if (totalDays > 0) {
      const elapsedDays = differenceInCalendarDays(today, new Date(goal.createdAt));
      const elapsedRatio = clamp(elapsedDays / totalDays, 0, 1);
      const expectedPct = elapsedRatio * 100;
      // paceScore > 0 means ahead of expected pace, < 0 means behind.
      paceScore = progressPct - expectedPct;
    } else if (totalDays <= 0 && differenceInCalendarDays(today, new Date(goal.targetDate)) > 0) {
      // Target date has passed and goal isn't complete.
      paceScore = -100;
    }
  }

  const actionRatio = weeklyActionCompletionRatio(actions, actionLogs, today);

  // Combine the two signals when both are available; otherwise use whichever exists.
  let score: number;
  if (paceScore !== null && actionRatio !== null) {
    score = paceScore * 0.7 + (actionRatio * 100 - 50) * 0.3;
  } else if (paceScore !== null) {
    score = paceScore;
  } else if (actionRatio !== null) {
    score = (actionRatio - 0.5) * 100;
  } else {
    // No deadline and no recurring actions to measure pace against — go by progress alone.
    return progressPct >= 15 ? "on_track" : "at_risk";
  }

  if (score >= -10) return "on_track";
  if (score >= -30) return "at_risk";
  return "behind";
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
  completed: "Completed",
  paused: "Paused",
};
