"use client";
import Link from "next/link";
import type { Fixture, ID, Player, Position, World } from "@/engine/core/types";
import { posTone } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Crest } from "./Crest";

export function PosBadge({ pos, className }: { pos: Position; className?: string }) {
  return <span className={cn("inline-flex w-9 justify-center rounded border px-1 py-0.5 text-[10px] font-bold", posTone(pos), className)}>{pos}</span>;
}

export function PlayerLink({ p, className }: { p: Pick<Player, "id" | "firstName" | "lastName">; className?: string }) {
  return (
    <Link href={`/game/player/?id=${p.id}`} className={cn("hover:text-accent hover:underline underline-offset-2", className)}>
      {p.firstName ? `${p.firstName.charAt(0)}. ` : ""}{p.lastName}
    </Link>
  );
}

export function ClubName({ world, id, crest = true, short = false }: { world: World; id: ID | null; crest?: boolean; short?: boolean }) {
  if (!id || !world.clubs[id]) return <span className="text-muted">Free agent</span>;
  const c = world.clubs[id];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {crest ? <Crest club={c} size={16} /> : null}
      <span className={cn("truncate", c.isUser && "font-semibold text-accent")}>{short ? c.shortName : c.name}</span>
    </span>
  );
}

export function FormDots({ form }: { form: ("W" | "D" | "L")[] }) {
  return (
    <span className="inline-flex gap-0.5">
      {form.map((r, i) => (
        <span key={i} className={cn("flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold", r === "W" ? "bg-accent/80 text-black" : r === "D" ? "bg-muted/50 text-black" : "bg-danger/80 text-white")}>{r}</span>
      ))}
    </span>
  );
}

export function scoreOf(world: World, f: Fixture): string {
  if (f.status !== "played" || !f.matchId) return "v";
  const m = world.matches[f.matchId];
  return `${m.homeGoals}–${m.awayGoals}${m.penalties ? ` (${m.penalties.home}–${m.penalties.away}p)` : m.extraTime ? " aet" : ""}`;
}

export function resultFor(world: World, f: Fixture, clubId: ID): "W" | "D" | "L" | null {
  if (f.status !== "played" || !f.matchId) return null;
  const m = world.matches[f.matchId];
  const home = f.homeClubId === clubId;
  const gf = home ? m.homeGoals : m.awayGoals;
  const ga = home ? m.awayGoals : m.homeGoals;
  if (gf === ga && m.penalties) return (home ? m.penalties.home > m.penalties.away : m.penalties.away > m.penalties.home) ? "W" : "L";
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub ? <div className="mt-0.5 text-sm text-muted">{sub}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
