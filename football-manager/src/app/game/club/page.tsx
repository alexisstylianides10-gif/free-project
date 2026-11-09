"use client";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, KV, Progress } from "@/components/ui/misc";
import { PageTitle } from "@/components/game/common";
import { Crest } from "@/components/game/Crest";
import { evaluateObjective, ordinal } from "@/engine/world/board";
import { postTransaction } from "@/engine/finance/ledger";
import { date, label, money, wage } from "@/lib/format";
import type { Facilities } from "@/engine/core/types";

export default function ClubPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const club = world.clubs[world.meta.userClubId];
  const objs = Object.values(world.objectives).filter((o) => o.clubId === club.id && o.seasonId === world.meta.currentSeasonId);
  const trophies = world.trophies.filter((t) => t.clubId === club.id);
  const history = world.clubHistory.filter((h) => h.clubId === club.id).slice().reverse();
  const security = club.boardConfidence >= 70 ? "Secure" : club.boardConfidence >= 45 ? "Stable" : club.boardConfidence >= 25 ? "Under pressure" : "In danger";
  const upgradeCost = (lvl: number) => Math.round(lvl * lvl * 350_000);
  const upgrade = (k: keyof Facilities) => mutate((w) => {
    const lvl = club.facilities[k];
    if (lvl >= 20) return toast("Already at maximum level.", "warn");
    const cost = upgradeCost(lvl + 1);
    if (club.finance.balance - cost < -club.finance.overdraftLimit * 0.5) return toast("The board will not fund this upgrade right now.", "error");
    postTransaction(w, club.id, -cost, "other", `${label(k)} facilities upgrade to ${lvl + 1}`, `facility:${k}:${lvl + 1}:${w.meta.currentDate}`);
    club.facilities[k] = lvl + 1;
    toast(`${label(k)} facilities upgraded to level ${lvl + 1}.`, "success");
  });
  return (
    <div className="space-y-4">
      <PageTitle title={club.name} sub={`Founded ${club.founded ?? "—"} · ${world.nations[club.nationId]?.name} · strategy: ${label(club.strategy)}`} actions={<Crest club={club} size={40} />} />
      {world.manager.sacked ? <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">You were dismissed. Load an earlier save from the main menu to continue.</div> : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Board & supporters" />
          <CardBody className="space-y-3">
            <div><div className="flex justify-between text-xs text-muted"><span>Board confidence</span><span>{Math.round(club.boardConfidence)}%</span></div><Progress value={club.boardConfidence} tone={club.boardConfidence < 30 ? "danger" : "accent"} /></div>
            <div><div className="flex justify-between text-xs text-muted"><span>Supporter mood</span><span>{Math.round(club.supporterMood)}%</span></div><Progress value={club.supporterMood} tone="info" /></div>
            <KV k="Job security" v={<Badge tone={security === "Secure" ? "accent" : security === "Stable" ? "info" : "danger"}>{security}</Badge>} />
            <KV k="Club reputation" v={`${club.reputation}/100`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Your contract" />
          <CardBody>
            <KV k="Manager" v={world.manager.name} />
            <KV k="Wage" v={wage(world.manager.wage)} />
            <KV k="Contract until" v={world.manager.contractEnd ? date(world.manager.contractEnd) : "—"} />
            <KV k="Manager reputation" v={`${world.manager.reputation}/100`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Facilities" />
          <CardBody className="space-y-2">
            {(["training", "youth", "youthRecruitment", "medical"] as (keyof Facilities)[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-2 text-sm">
                <span>{label(k.replace(/([A-Z])/g, " $1"))} <span className="text-muted">{club.facilities[k]}/20</span></span>
                <Button size="sm" variant="ghost" disabled={club.facilities[k] >= 20} onClick={() => confirm(`Upgrade for ${money(upgradeCost(club.facilities[k] + 1))}?`) && upgrade(k)}>Upgrade · {money(upgradeCost(club.facilities[k] + 1))}</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title={`Board objectives ${world.seasons[world.meta.currentSeasonId].label}`} />
        {objs.length === 0 ? <Empty title="No objectives set" /> : (
          <table className="tbl" data-testid="objectives"><thead><tr><th>Objective</th><th>Importance</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>{objs.map((o) => {
              const ev = evaluateObjective(world, o, false);
              const prog = o.kind === "league_position" ? (ev.progress ? `Currently ${ordinal(ev.progress)}` : "—") : o.kind === "wage_budget" ? `${wage(ev.progress ?? 0)} of ${wage(o.target)}` : o.kind === "youth_minutes" ? `${ev.progress ?? 0} of ${o.target} min` : ev.progress !== null && ev.progress >= 0 ? `Reached round ${ev.progress + 1}` : "Not started";
              return <tr key={o.id}><td>{o.description}</td><td><Badge tone={o.importance === "critical" ? "danger" : o.importance === "high" ? "warn" : "neutral"}>{o.importance}</Badge></td><td className="text-sm text-muted">{prog}</td><td><Badge tone={o.status === "met" ? "accent" : o.status === "failed" ? "danger" : "info"}>{o.status}</Badge></td></tr>;
            })}</tbody>
          </table>
        )}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Trophy cabinet" />
          {trophies.length === 0 ? <Empty title="No trophies won during this career yet" /> : <CardBody className="flex flex-wrap gap-2">{trophies.map((t) => <span key={t.id} className="chip border-gold/40 text-gold">🏆 {world.competitions[t.competitionId]?.name} {t.seasonLabel}</span>)}</CardBody>}
        </Card>
        <Card className="overflow-auto">
          <CardHeader title="Season history" />
          {history.length === 0 ? <Empty title="The first season is under way" /> : (
            <table className="tbl"><thead><tr><th>Season</th><th>League</th><th className="num">Pos</th><th className="num">Pts</th><th>Cups</th><th className="num">Revenue</th></tr></thead>
              <tbody>{history.map((h) => <tr key={h.id}><td>{h.seasonLabel}</td><td className="text-xs">{h.competitionId ? world.competitions[h.competitionId]?.shortName : "—"}</td><td className="num">{h.position ?? "—"}</td><td className="num">{h.points}</td><td className="text-xs">{h.cupResults.map((c) => `${world.competitions[c.competitionId]?.shortName}: ${c.reached}`).join(", ")}</td><td className="num">{money(h.revenue)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
