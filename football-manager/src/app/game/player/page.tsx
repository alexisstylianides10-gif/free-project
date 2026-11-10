"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Empty, KV, Progress, RatingChip } from "@/components/ui/misc";
import { ClubName, PageTitle, PosBadge } from "@/components/game/common";
import { NegotiationDialog } from "@/components/game/Negotiation";
import { PlayerCard } from "@/components/game/PlayerCard";
import { ATTRIBUTE_GROUPS, POSITIONS, type AttributeKey, type Position, type TrainingFocus } from "@/engine/core/types";
import { overall, ratingInPosition } from "@/engine/core/ratings";
import { ageOn } from "@/engine/core/dates";
import { fullName } from "@/engine/world/players";
import { knowledgeOf, startScouting } from "@/engine/club/scouting";
import { releasePlayer, exerciseLoanOption, endLoan } from "@/engine/transfers/market";
import { date, label, money, wage } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function PlayerPage() {
  return (
    <Suspense fallback={null}>
      <PlayerView />
    </Suspense>
  );
}

const ATTR_LABEL = (k: string) => label(k.replace(/([A-Z])/g, " $1"));

function attrTone(v: number): string {
  return v >= 16 ? "text-gold" : v >= 13 ? "text-accent" : v >= 10 ? "text-fg" : v >= 7 ? "text-muted" : "text-danger/80";
}

function PlayerView() {
  const id = useSearchParams().get("id") ?? "";
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const router = useRouter();
  const [neg, setNeg] = useState<null | "buy" | "loan" | "renew">(null);
  const p = world.players[id];
  if (!p) return <Empty title="Player not found" />;
  const own = p.clubId === world.meta.userClubId;
  const ownedOut = p.loanParentClubId === world.meta.userClubId;
  const k = knowledgeOf(world, p);
  const ovr = overall(p);
  const age = ageOn(p.dob, world.meta.currentDate);
  const history = world.playerHistory.filter((h) => h.playerId === p.id);
  const transfers = world.transfers.filter((t) => t.playerId === p.id);
  const dev = [...history.map((h) => ({ d: h.seasonLabel, ovr: h.overall })), ...world.development.filter((d) => d.playerId === p.id).map((d) => ({ d: d.date, ovr: d.overall })), { d: "Now", ovr }];
  const loan = Object.values(world.loans).find((l) => l.active && l.playerId === p.id);
  const comps = Object.entries(p.seasonStats);
  const hidden = !k.exact;
  const fuzzy = (v: number) => (hidden ? `${Math.max(1, Math.floor(v / 4) * 4)}–${Math.min(20, Math.floor(v / 4) * 4 + 4)}` : v);

  return (
    <div className="space-y-4">
      <PageTitle
        title={fullName(p)}
        sub={<span className="inline-flex flex-wrap items-center gap-2"><PosBadge pos={p.position} />{p.altPositions.map((a) => <span key={a} className="chip">{a}</span>)} · Age {age} · {world.nations[p.nationId]?.name} · <ClubName world={world} id={p.clubId} />{p.generated ? <Badge>Generated player</Badge> : null}</span>}
        actions={
          own ? (
            <>
              <Button size="sm" onClick={() => setNeg("renew")} disabled={!!p.loanParentClubId} data-testid="renew-contract">Renew contract</Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm(`Release ${fullName(p)}? Up to one year of remaining wages will be paid as compensation.`)) { const r = mutate((w) => releasePlayer(w, p.id)); toast(r.message, r.ok ? "success" : "error"); if (r.ok) router.push("/game/squad/"); } }} disabled={!!p.loanParentClubId}>Release</Button>
              {loan && loan.optionToBuyFee !== null && loan.loanClubId === world.meta.userClubId ? <Button size="sm" variant="primary" onClick={() => { const r = mutate((w) => exerciseLoanOption(w, loan.id)); toast(r.message, r.ok ? "success" : "error"); }}>Buy for {money(loan.optionToBuyFee)}</Button> : null}
            </>
          ) : ownedOut && loan ? (
            <Button size="sm" onClick={() => { mutate((w) => endLoan(w, loan.id, "recalled")); toast("Player recalled from loan.", "success"); }}>Recall from loan</Button>
          ) : (
            <>
              {!k.exact ? <Button size="sm" onClick={() => { const r = mutate((w) => startScouting(w, w.meta.userClubId, { kind: "player", playerId: p.id })); toast(r.message, r.ok ? "success" : "error"); }}>Scout player</Button> : null}
              {p.clubId ? <Button size="sm" onClick={() => setNeg("loan")} data-testid="loan-offer">Loan offer</Button> : null}
              <Button size="sm" variant="primary" onClick={() => setNeg("buy")} data-testid="make-offer">{p.clubId ? "Make transfer offer" : "Offer contract"}</Button>
            </>
          )
        }
      />
      <div className="flex justify-center md:justify-start"><PlayerCard world={world} p={p} hidden={hidden} /></div>
      {hidden ? <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm text-info">Your scouts have limited knowledge of this player. Attributes are shown as ranges until he is scouted.</div> : null}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Attributes" action={<span className="flex items-center gap-2 text-xs text-muted">Overall <RatingChip value={hidden ? `${k.overall[0]}–${k.overall[1]}` : ovr} /> Potential <RatingChip value={`${k.potential[0]}–${k.potential[1]}`} /></span>} />
          <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(p.position === "GK" ? (["goalkeeping", "mental", "physical", "technical"] as const) : (["technical", "mental", "physical"] as const)).map((g) => (
              <div key={g}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g}</div>
                {ATTRIBUTE_GROUPS[g].map((a: AttributeKey) => (
                  <div key={a} className="flex items-center justify-between py-0.5 text-sm">
                    <span className="text-fg/80">{ATTR_LABEL(a)}</span>
                    <span className={cn("font-semibold tabular-nums", attrTone(p.attributes[a]))}>{fuzzy(p.attributes[a])}</span>
                  </div>
                ))}
              </div>
            ))}
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Contract" />
            <CardBody>
              {p.contract ? (
                <>
                  <KV k="Wage" v={wage(p.contract.wage)} />
                  <KV k="Expires" v={date(p.contract.endDate)} />
                  <KV k="Squad role" v={label(p.contract.squadRole)} />
                  <KV k="Release clause" v={p.contract.releaseClause ? money(p.contract.releaseClause) : "None"} />
                  <KV k="Bonuses" v={`${money(p.contract.appearanceBonus)}/app · ${money(p.contract.goalBonus)}/goal`} />
                </>
              ) : <div className="text-sm text-muted">No contract (free agent).</div>}
              <KV k="Market value" v={money(p.value)} />
              {loan ? <KV k="Loan" v={`${world.clubs[loan.parentClubId]?.shortName} → ${world.clubs[loan.loanClubId]?.shortName} until ${date(loan.endDate)}`} /> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Condition" />
            <CardBody className="space-y-2 text-sm">
              {[["Match fitness", p.fitness], ["Fatigue", p.fatigue], ["Morale", p.morale], ["Happiness", p.happiness], ["Sharpness", p.sharpness], ["Tactical familiarity", p.tacticalFamiliarity]].map(([n, v]) => (
                <div key={n as string}><div className="flex justify-between text-xs text-muted"><span>{n}</span><span>{Math.round(v as number)}%</span></div><Progress value={v as number} tone={n === "Fatigue" ? ((v as number) > 50 ? "danger" : "warn") : "accent"} /></div>
              ))}
              <KV k="Form (avg rating)" v={p.form.toFixed(2)} />
              <KV k="Injury" v={p.injury && p.injury.until > world.meta.currentDate ? <span className="text-danger">{p.injury.type} (until {date(p.injury.until)})</span> : "Fit"} />
              <KV k="Suspensions" v={p.suspensions.filter((s) => s.matches > 0).map((s) => `${s.matches} (${s.reason})`).join(", ") || "None"} />
            </CardBody>
          </Card>
          {own ? (
            <Card>
              <CardHeader title="Development" />
              <CardBody className="space-y-3">
                <div>
                  <label className="label">Individual training focus</label>
                  <Select value={p.trainingFocus} onChange={(v) => mutate(() => { p.trainingFocus = v as TrainingFocus; })} options={["balanced", "technical", "mental", "physical", "goalkeeping", "attacking", "defending", "set_pieces"].map((x) => ({ value: x, label: label(x) }))} testId="training-focus" />
                </div>
                <div>
                  <label className="label">Learn a new position</label>
                  <Select value={p.retrainPosition ?? ""} onChange={(v) => mutate(() => { p.retrainPosition = (v || null) as Position | null; })} options={[{ value: "", label: "None" }, ...POSITIONS.filter((x) => x !== p.position && !p.altPositions.includes(x)).map((x) => ({ value: x, label: `${x} (now ${ratingInPosition(p, x)})` }))]} />
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Season statistics" />
          {comps.length === 0 ? <Empty title="No appearances this season" /> : (
            <table className="tbl"><thead><tr><th>Competition</th><th className="num">Apps</th><th className="num">Gls</th><th className="num">Ast</th><th className="num">xG</th><th className="num">Avg</th><th className="num">Y/R</th></tr></thead>
              <tbody>{comps.map(([cid, s]) => <tr key={cid}><td>{world.competitions[cid]?.name}</td><td className="num">{s.apps} ({s.starts})</td><td className="num">{s.goals}</td><td className="num">{s.assists}</td><td className="num">{s.xg.toFixed(1)}</td><td className="num">{s.apps ? (s.ratingSum / s.apps).toFixed(2) : "—"}</td><td className="num">{s.yellow}/{s.red}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <CardHeader title="Ability over time" />
          <CardBody className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dev}><CartesianGrid stroke="#212b38" strokeDasharray="3 3" /><XAxis dataKey="d" stroke="#8b9bb0" fontSize={10} /><YAxis domain={["dataMin - 3", "dataMax + 3"]} stroke="#8b9bb0" fontSize={10} /><Tooltip contentStyle={{ background: "#0e131a", border: "1px solid #212b38" }} /><Line type="monotone" dataKey="ovr" stroke="#22d38b" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Career history" />
          {history.length === 0 ? <Empty title="No completed seasons yet" /> : (
            <table className="tbl"><thead><tr><th>Season</th><th>Club</th><th className="num">Apps</th><th className="num">Gls</th><th className="num">Avg</th><th className="num">Ovr</th></tr></thead>
              <tbody>{history.map((h) => <tr key={h.id}><td>{h.seasonLabel}</td><td><ClubName world={world} id={h.clubId} short /></td><td className="num">{h.apps}</td><td className="num">{h.goals}</td><td className="num">{h.avgRating.toFixed(2)}</td><td className="num">{h.overall}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <CardHeader title="Transfer history" />
          {transfers.length === 0 ? <Empty title="No transfers recorded in this career" /> : (
            <table className="tbl"><thead><tr><th>Date</th><th>From</th><th>To</th><th>Type</th><th className="num">Fee</th></tr></thead>
              <tbody>{transfers.map((t) => <tr key={t.id}><td className="text-xs">{date(t.date)}</td><td><ClubName world={world} id={t.fromClubId} short /></td><td><ClubName world={world} id={t.toClubId} short /></td><td className="text-xs">{label(t.type)}</td><td className="num">{t.fee ? money(t.fee) : "—"}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      </div>
      {neg ? <NegotiationDialog playerId={p.id} mode={neg} open onClose={() => setNeg(null)} /> : null}
    </div>
  );
}
