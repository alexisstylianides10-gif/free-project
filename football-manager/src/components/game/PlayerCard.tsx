"use client";
import type { Player, World } from "@/engine/core/types";
import { overall } from "@/engine/core/ratings";
import { faceStats, statTone } from "@/lib/face";
import { cn } from "@/lib/cn";
import { Crest } from "./Crest";

/** Large player card: rating, position, nation, club and six face stats. Original design (no licensed assets). */
export function PlayerCard({ world, p, hidden = false, className }: { world: World; p: Player; hidden?: boolean; className?: string }) {
  const ovr = overall(p);
  const tier = ovr >= 80 ? "from-[#3a2f0b] via-[#5c4a12] to-[#2a220a] border-gold/50" : ovr >= 70 ? "from-[#0b2a1d] via-[#114a32] to-[#0a1f16] border-accent/40" : ovr >= 60 ? "from-[#0b1f2e] via-[#12344d] to-[#0a1824] border-info/40" : "from-[#1a1f27] via-[#232a35] to-[#141920] border-line";
  const club = p.clubId ? world.clubs[p.clubId] : null;
  const initials = `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
  return (
    <div className={cn("relative w-full max-w-[260px] overflow-hidden rounded-2xl border bg-gradient-to-b p-4 shadow-xl", tier, className)} data-testid="player-card">
      <div className="flex items-start justify-between">
        <div className="leading-none">
          <div className="text-5xl font-black tabular-nums">{hidden ? "??" : ovr}</div>
          <div className="mt-1 text-lg font-bold tracking-wide text-fg/90">{p.position}</div>
          <div className="mt-2 text-xs font-semibold text-muted">{world.nations[p.nationId]?.code}</div>
          {club ? <div className="mt-2"><Crest club={club} size={22} /></div> : null}
        </div>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-3xl font-black text-white/30 ring-1 ring-white/10" aria-hidden>{initials}</div>
      </div>
      <div className="mt-3 truncate text-center text-base font-bold uppercase tracking-wide">{p.lastName}</div>
      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-sm">
        {faceStats(p).map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className={cn("font-bold tabular-nums", hidden ? "text-muted" : statTone(s.value))}>{hidden ? "–" : s.value}</span>
            <span className="text-xs text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact row card for lists on small screens. */
export function MiniStats({ p }: { p: Player }) {
  return (
    <span className="flex gap-2 text-[11px] tabular-nums text-muted">
      {faceStats(p).map((s) => <span key={s.label}><span className={cn("font-semibold", statTone(s.value))}>{s.value}</span> {s.label}</span>)}
    </span>
  );
}
