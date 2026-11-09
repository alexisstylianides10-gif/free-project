import { formatMoney } from "@/engine/core/util";
import { formatDate } from "@/engine/core/dates";
import type { Position } from "@/engine/core/types";
import { POSITION_GROUP } from "@/engine/core/ratings";

export const money = formatMoney;
export const date = (d: string) => formatDate(d);
export const shortDate = (d: string) => formatDate(d, { day: "numeric", month: "short" });
export const longDate = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
export const pct = (v: number) => `${Math.round(v)}%`;
export const wage = (v: number) => `${formatMoney(v)}/wk`;

export function posTone(p: Position): string {
  const g = POSITION_GROUP[p];
  return g === "GK" ? "text-gold border-gold/30 bg-gold/10" : g === "DEF" ? "text-info border-info/30 bg-info/10" : g === "MID" ? "text-accent border-accent/30 bg-accent/10" : "text-danger border-danger/30 bg-danger/10";
}

export function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
