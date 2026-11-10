"use client";
import { useEffect, useState } from "react";
import type { Club, Player, Selection, TacticalSystem, World } from "@/engine/core/types";
import { overall, ratingInPosition } from "@/engine/core/ratings";
import { PosBadge } from "./common";
import { RatingChip } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

type Pick = { kind: "slot"; slotId: string } | { kind: "bench"; playerId: string } | { kind: "reserve"; playerId: string };

/**
 * Tap-to-swap line-up editor (works with touch). Tap any two entries to swap them:
 * starter ↔ starter (positions), starter ↔ substitute/reserve, substitute ↔ reserve.
 */
export function LineupSwapper({ world, club, tactic, sel, benchSize, onChange, externalSlot }: {
  world: World;
  club: Club;
  tactic: TacticalSystem;
  sel: Selection;
  benchSize: number;
  onChange: (fn: (s: Selection) => void) => void;
  externalSlot: string | null;
}) {
  const [pick, setPick] = useState<Pick | null>(null);
  useEffect(() => {
    if (externalSlot) setPick({ kind: "slot", slotId: externalSlot });
  }, [externalSlot]);
  const today = world.meta.currentDate;
  const squad = Object.values(world.players).filter((p) => p.clubId === club.id && !p.retired);
  const starters = new Set(Object.values(sel.starters));
  const reserves = squad.filter((p) => !starters.has(p.id) && !sel.bench.includes(p.id)).sort((a, b) => overall(b) - overall(a));
  const unavailable = (p: Player) => (!!p.injury && p.injury.until > today) || p.suspensions.some((s) => s.matches > 0);

  const playerOf = (pk: Pick): string | null => (pk.kind === "slot" ? sel.starters[pk.slotId] ?? null : pk.playerId);
  const same = (a: Pick, b: Pick) => JSON.stringify(a) === JSON.stringify(b);

  const tap = (pk: Pick) => {
    if (!pick) return setPick(pk);
    if (same(pick, pk)) return setPick(null);
    const a = pick;
    const b = pk;
    onChange((s) => {
      const pa = playerOf(a);
      const pb = playerOf(b);
      const remove = (id: string | null) => {
        if (!id) return;
        s.bench = s.bench.filter((x) => x !== id);
        for (const [k, v] of Object.entries(s.starters)) if (v === id) delete s.starters[k];
      };
      const place = (target: Pick, id: string | null) => {
        if (!id) return;
        if (target.kind === "slot") s.starters[target.slotId] = id;
        else if (target.kind === "bench") {
          const i = s.bench.indexOf(target.playerId);
          if (i >= 0) s.bench[i] = id;
          else if (s.bench.length < benchSize) s.bench.push(id);
        }
        // reserve: simply not selected
      };
      const benchIndexA = a.kind === "bench" ? s.bench.indexOf(a.playerId) : -1;
      const benchIndexB = b.kind === "bench" ? s.bench.indexOf(b.playerId) : -1;
      remove(pa);
      remove(pb);
      // put each player where the other one was
      if (b.kind === "slot") s.starters[b.slotId] = pa ?? "";
      if (a.kind === "slot") s.starters[a.slotId] = pb ?? "";
      if (b.kind === "bench" && pa) s.bench.splice(Math.min(benchIndexB, s.bench.length), 0, pa);
      if (a.kind === "bench" && pb) s.bench.splice(Math.min(benchIndexA, s.bench.length), 0, pb);
      for (const [k, v] of Object.entries(s.starters)) if (!v) delete s.starters[k];
      void place;
    });
    setPick(null);
  };

  const Row = ({ p, pk, label }: { p: Player | null; pk: Pick; label: React.ReactNode }) => {
    const active = pick && same(pick, pk);
    const slot = pk.kind === "slot" ? tactic.slots.find((x) => x.id === pk.slotId) : null;
    return (
      <button type="button" onClick={() => tap(pk)} data-testid={pk.kind === "slot" ? `lineup-slot-${pk.slotId}` : `lineup-${pk.kind}-${pk.playerId}`}
        className={cn("flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition", active ? "border-accent bg-accent/15" : "border-line bg-surface2/40 active:bg-surface2", p && unavailable(p) && "opacity-60")}>
        <span className="w-10 shrink-0">{label}</span>
        {p ? (
          <>
            <span className="min-w-0 flex-1 truncate">{p.firstName.charAt(0)}. {p.lastName} <span className="text-xs text-muted">{p.position}</span>{unavailable(p) ? <span className="ml-1 text-xs text-danger">{p.injury ? "injured" : "suspended"}</span> : null}</span>
            <span className="w-12 text-right text-[11px] text-muted">{Math.round(p.fitness)}%</span>
            <RatingChip value={slot ? ratingInPosition(p, slot.position) : overall(p)} />
          </>
        ) : <span className="flex-1 text-muted">Empty — tap a player to fill</span>}
      </button>
    );
  };

  return (
    <div className="space-y-4" data-testid="lineup-swapper">
      <p className="text-xs text-muted">{pick ? "Now tap the player to swap with." : "Tap a player, then tap another to swap them. Ratings show how good each player is in that position."}</p>
      <section className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Starting XI</div>
        {tactic.slots.map((slot) => <Row key={slot.id} p={world.players[sel.starters[slot.id]] ?? null} pk={{ kind: "slot", slotId: slot.id }} label={<PosBadge pos={slot.position} />} />)}
      </section>
      <section className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Substitutes ({sel.bench.length}/{benchSize})</div>
        {sel.bench.map((id) => world.players[id] ? <Row key={id} p={world.players[id]} pk={{ kind: "bench", playerId: id }} label={<span className="text-xs text-muted">SUB</span>} /> : null)}
        {sel.bench.length < benchSize && pick && pick.kind === "reserve" ? (
          <button type="button" className="w-full rounded-lg border border-dashed border-accent/50 px-3 py-2 text-sm text-accent" onClick={() => { onChange((s) => { s.bench.push((pick as { playerId: string }).playerId); }); setPick(null); }}>Add to the bench</button>
        ) : null}
      </section>
      <section className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Reserves</div>
        {reserves.map((p) => <Row key={p.id} p={p} pk={{ kind: "reserve", playerId: p.id }} label={<PosBadge pos={p.position} />} />)}
      </section>
    </div>
  );
}
