/**
 * Expected goals model (explicitly defined, deterministic).
 *
 *   logit(xG) = -1.40 − 0.11·distance(m) + 1.6·angle(rad)
 *               − 0.9·[header] + 0.75·[big chance: 1v1 / through ball]
 *               − 0.3·[direct free kick] − 0.9·pressure(0..1)
 *   penalties use a fixed xG of 0.76.
 *
 * distance is measured from the centre of the goal, angle is the visible goal
 * mouth angle from the shooting position (7.32m goal on a 105×68m pitch).
 */
export interface ShotContext {
  /** x in attacking frame 0..100 (100 = opponent goal line) */
  x: number;
  y: number;
  header: boolean;
  bigChance: boolean;
  directFreeKick: boolean;
  penalty: boolean;
  pressure: number;
}

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
const GOAL_WIDTH = 7.32;

export function shotGeometry(x: number, y: number): { distance: number; angle: number } {
  const dx = Math.max(0.5, ((100 - x) / 100) * PITCH_LENGTH);
  const dy = ((y - 50) / 100) * PITCH_WIDTH;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const half = GOAL_WIDTH / 2;
  let angle = Math.atan2(GOAL_WIDTH * dx, dx * dx + dy * dy - half * half);
  if (angle < 0) angle += Math.PI;
  return { distance, angle };
}

export function expectedGoals(c: ShotContext): number {
  if (c.penalty) return 0.76;
  const { distance, angle } = shotGeometry(c.x, c.y);
  const logit = -1.4 - 0.11 * distance + 1.6 * angle - (c.header ? 0.9 : 0) + (c.bigChance ? 0.75 : 0) - (c.directFreeKick ? 0.3 : 0) - 0.9 * c.pressure;
  const xg = 1 / (1 + Math.exp(-logit));
  return Math.min(0.97, Math.max(0.005, xg));
}

export function logit(p: number): number {
  const q = Math.min(0.999, Math.max(0.001, p));
  return Math.log(q / (1 - q));
}
