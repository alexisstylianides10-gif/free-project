import "server-only";

/**
 * In-process sliding-window rate limiter, keyed per user. Good enough for a
 * single-instance Railway deployment (numReplicas: 1); if this service ever
 * scales horizontally, replace the Map with a shared store (e.g. Redis) —
 * the call site (api/chat) doesn't need to change.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

const hits = new Map<string, number[]>();

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > MAX_PER_WINDOW;
}
