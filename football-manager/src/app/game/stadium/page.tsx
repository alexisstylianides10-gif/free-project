"use client";
import { useState } from "react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input, KV, Progress, Stat } from "@/components/ui/misc";
import { PageTitle } from "@/components/game/common";
import { quoteProject, startProject, type ProjectKind, MAX_CAPACITY } from "@/engine/club/stadium";
import { attendanceFor, effectiveCapacity } from "@/engine/world/matchday";
import type { Fixture } from "@/engine/core/types";
import { diffDays } from "@/engine/core/dates";
import { date, label, money } from "@/lib/format";

const KINDS: { kind: ProjectKind; amountLabel?: string; defaultAmount?: number }[] = [
  { kind: "expansion", amountLabel: "Extra seats", defaultAmount: 5000 },
  { kind: "renovation" },
  { kind: "pitch" },
  { kind: "lighting" },
  { kind: "facilities" },
  { kind: "hospitality" },
  { kind: "vip", amountLabel: "Boxes", defaultAmount: 10 },
  { kind: "new_stadium", amountLabel: "New capacity", defaultAmount: 0 },
];

export default function StadiumPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const club = world.clubs[world.meta.userClubId];
  const st = world.stadiums[club.stadiumId];
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const nextHome = Object.values(world.fixtures).filter((f) => f.homeClubId === club.id && f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))[0];
  const sample: Fixture = nextHome ?? { id: "sample", competitionSeasonId: "", competitionId: club.leagueId ?? Object.keys(world.competitions)[0], seasonId: world.meta.currentSeasonId, date: world.meta.currentDate, round: 1, roundName: "League", homeClubId: club.id, awayClubId: Object.values(world.clubs).find((c) => c.leagueId === club.leagueId && c.id !== club.id)?.id ?? club.id, stadiumId: club.stadiumId, tieId: null, leg: null, groupIndex: null, status: "scheduled", matchId: null, requiresWinner: false };
  const att = attendanceFor(world, sample);
  const usable = effectiveCapacity(world, st.id);
  const active = st.projects.filter((p) => p.endDate >= world.meta.currentDate);
  const done = st.projects.filter((p) => p.endDate < world.meta.currentDate);
  return (
    <div className="space-y-4">
      <PageTitle title={st.namingRightsName ? `${st.namingRightsName}` : st.name} sub={`${st.city}${st.namingRightsName ? ` · officially ${st.name}` : ""}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Stadium" />
          <CardBody className="grid grid-cols-2 gap-4">
            <Stat label="Capacity" value={st.capacity.toLocaleString()} sub={usable < st.capacity ? `${usable.toLocaleString()} usable during works` : `${Math.round(st.seatedRatio * 100)}% seated`} />
            <Stat label="Est. attendance" value={att.toLocaleString()} sub={nextHome ? `vs ${world.clubs[nextHome.awayClubId].shortName}` : "typical league match"} tone="accent" />
            <div className="col-span-2 space-y-2 text-sm">
              {[["Pitch quality", st.pitchQuality], ["Structural condition", st.condition]].map(([n, v]) => <div key={n as string}><div className="flex justify-between text-xs text-muted"><span>{n}</span><span>{Math.round(v as number)}%</span></div><Progress value={v as number} /></div>)}
              <KV k="Lighting" v={`${st.lighting}/5`} />
              <KV k="Facilities" v={`${st.facilities}/5`} />
              <KV k="Hospitality" v={`${st.hospitality}/5`} />
              <KV k="VIP boxes" v={st.vipBoxes} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Matchday" />
          <CardBody className="space-y-4">
            <div>
              <label className="label">Ticket price (average)</label>
              <div className="flex gap-2">
                <Input type="number" min={5} max={250} value={club.finance.ticketPrice} onChange={(e) => mutate(() => { club.finance.ticketPrice = Math.max(5, Math.min(250, Number(e.target.value) || 5)); })} data-testid="ticket-price" />
              </div>
              <p className="mt-1 text-xs text-muted">Demand is price-sensitive: higher prices raise revenue per fan but reduce attendance and supporter mood.</p>
            </div>
            <KV k="Gate receipts (estimate)" v={money(att * club.finance.ticketPrice)} />
            <KV k="Hospitality (estimate)" v={money(st.vipBoxes * 1500 + st.hospitality * att * 1.2)} />
            <div>
              <label className="label">Maintenance budget</label>
              <Select value={String(st.maintenanceLevel)} onChange={(v) => mutate(() => { st.maintenanceLevel = Number(v) as 1 | 2 | 3; })} options={[{ value: "1", label: "Minimal (cheap, condition declines)" }, { value: "2", label: "Standard" }, { value: "3", label: "Premium (pitch and condition improve)" }]} />
              <p className="mt-1 text-xs text-muted">Weekly cost ≈ {money(st.capacity * 1.1 * st.maintenanceLevel + st.vipBoxes * 300)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Works in progress" />
          <CardBody className="space-y-3 text-sm">
            {active.length === 0 ? <div className="text-muted">No projects under way.</div> : active.map((p) => {
              const total = diffDays(p.endDate, p.startDate) || 1;
              const prog = 100 - (diffDays(p.endDate, world.meta.currentDate) / total) * 100;
              return <div key={p.id}><div className="flex justify-between"><span>{p.description}</span><span className="text-xs text-muted">{date(p.endDate)}</span></div><Progress value={prog} className="mt-1" /><div className="mt-0.5 text-xs text-muted">Paid {money(p.paid)} of {money(p.cost)}{p.capacityReduction ? ` · ${p.capacityReduction.toLocaleString()} seats closed` : ""}</div></div>;
            })}
            {done.length ? <div className="border-t border-line pt-2 text-xs text-muted">Completed: {done.map((p) => p.description).join(", ")}</div> : null}
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-auto">
        <CardHeader title="Development projects" sub={`Construction is paid as a 20% deposit then monthly instalments. Maximum capacity ${MAX_CAPACITY.toLocaleString()}.`} />
        <table className="tbl min-w-[860px]">
          <thead><tr><th>Project</th><th>Size</th><th className="num">Cost</th><th className="num">Duration</th><th className="num">Seats closed</th><th>Feasibility</th><th /></tr></thead>
          <tbody>
            {KINDS.map(({ kind, amountLabel, defaultAmount }) => {
              const amount = amounts[kind] ?? defaultAmount ?? 0;
              const q = quoteProject(world, club.id, kind, amount);
              return (
                <tr key={kind}>
                  <td><div className="font-medium">{label(kind)}</div><div className="text-xs text-muted">{q.description}</div></td>
                  <td>{amountLabel ? <Input type="number" className="h-8 w-28" value={amount || ""} placeholder={kind === "new_stadium" ? "auto" : ""} onChange={(e) => setAmounts({ ...amounts, [kind]: Number(e.target.value) })} aria-label={amountLabel} /> : <span className="text-xs text-muted">—</span>}</td>
                  <td className="num">{money(q.cost)}</td>
                  <td className="num">{Math.round(q.days / 30)} months</td>
                  <td className="num">{q.capacityReduction ? q.capacityReduction.toLocaleString() : "—"}</td>
                  <td className="text-xs">{q.feasible ? <Badge tone="accent">Approved</Badge> : <span className="text-warn">{q.reason}</span>}</td>
                  <td className="text-right"><Button size="sm" variant="outline" disabled={!q.feasible} onClick={() => { if (confirm(`Start "${q.description}" for ${money(q.cost)}?`)) { const r = mutate((w) => startProject(w, club.id, kind, amount)); toast(r.message, r.ok ? "success" : "error"); } }} data-testid={`start-${kind}`}>Start</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
