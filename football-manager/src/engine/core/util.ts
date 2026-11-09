export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const round = (v: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};
export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
export const avg = (arr: number[]): number => (arr.length ? sum(arr) / arr.length : 0);
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}
export function formatMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${sign}€${round(a / 1_000_000_000, 2)}bn`;
  if (a >= 1_000_000) return `${sign}€${round(a / 1_000_000, a >= 100_000_000 ? 0 : 1)}m`;
  if (a >= 1_000) return `${sign}€${round(a / 1_000, 0)}k`;
  return `${sign}€${Math.round(a)}`;
}
/** Round a money amount to a "negotiation friendly" figure. */
export function niceMoney(v: number): number {
  if (v <= 0) return 0;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
}
/** Like niceMoney but never rounds below the input (used for asking prices). */
export function niceMoneyUp(v: number): number {
  if (v <= 0) return 0;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1);
  return Math.ceil(v / mag) * mag;
}
