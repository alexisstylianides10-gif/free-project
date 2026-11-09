"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorld } from "@/store/game";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/misc";
import { ClubName, FormDots, PageTitle, PlayerLink, scoreOf } from "@/components/game/common";
import { groupTables, leagueTable } from "@/engine/competition/table";
import { tieAggregate } from "@/engine/competition/season";
import type { CompetitionSeason, TableRow, World } from "@/engine/core/types";
import { shortDate } from "@/lib/format";

export default function CompetitionsPage() {
  const world = useWorld();
  const uc = world.clubs[world.meta.userClubId];
  const [season, setSeason] = useState(world.meta.currentSeasonId);
  const [compId, setCompId] = useState(uc.leagueId ?? Object.keys(world.competitions)[0]);
  const comp = world.competitions[compId];
  const cs = world.competitionSeasons[`cs_${compId}_${season}`];
  const comps = Object.values(world.competitions).sort((a, b) => (a.nationId ?? "zz").localeCompare(b.nationId ?? "zz") || a.type.localeCompare(b.type) || a.tier - b.tier);
  return (
    <div className="space-y-4">
      <PageTitle title="Competitions" actions={<>
        <Select label="Competition" value={compId} onChange={setCompId} options={comps.map((c) => ({ value: c.id, label: c.name }))} className="w-64" testId="competition-select" />
        <Select label="Season" value={season} onChange={setSeason} options={Object.values(world.seasons).map((s) => ({ value: s.id, label: s.label }))} className="w-32" />
      </>} />
      {!cs ? <Card><Empty title="This competition was not played that season" /></Card> : comp.type === "league" ? <League world={world} cs={cs} /> : <Cup world={world} cs={cs} />}
      {cs ? <TopScorers world={world} compId={compId} /> : null}
    </div>
  );
}

function TableView({ world, rows, zones }: { world: World; rows: TableRow[]; zones?: { up: number; down: number; q: number } }) {
  return (
    <table className="tbl" data-testid="league-table">
      <thead><tr><th>#</th><th>Club</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th><th>Form</th></tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const zone = zones ? (i < zones.q ? "border-l-2 border-l-accent" : i < zones.up ? "border-l-2 border-l-info" : i >= rows.length - zones.down ? "border-l-2 border-l-danger" : "") : "";
          return (
            <tr key={r.clubId} className={world.clubs[r.clubId]?.isUser ? "bg-accent/5" : ""}>
              <td className={`w-8 text-muted ${zone}`}>{i + 1}</td>
              <td><ClubName world={world} id={r.clubId} /></td>
              <td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td>
              <td className="num">{r.goalsFor}</td><td className="num">{r.goalsAgainst}</td><td className="num">{r.goalsFor - r.goalsAgainst}</td>
              <td className="num font-semibold">{r.points}</td><td><FormDots form={r.form} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function League({ world, cs }: { world: World; cs: CompetitionSeason }) {
  const comp = world.competitions[cs.competitionId];
  const rows = useMemo(() => leagueTable(world, cs), [world, cs, world.meta.currentDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = comp.league?.qualification.reduce((m, x) => Math.max(m, x.toPosition), 0) ?? 0;
  const up = comp.league?.promotion?.places ?? 0;
  const down = comp.league?.relegation?.places ?? 0;
  const rounds = Array.from(new Set(Object.values(world.fixtures).filter((f) => f.competitionSeasonId === cs.id).map((f) => f.round))).sort((a, b) => a - b);
  const nextRound = Object.values(world.fixtures).filter((f) => f.competitionSeasonId === cs.id && f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))[0]?.round ?? rounds[rounds.length - 1];
  const [round, setRound] = useState<number>(nextRound ?? 1);
  const fx = Object.values(world.fixtures).filter((f) => f.competitionSeasonId === cs.id && f.round === round);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card className="overflow-auto">
        <CardHeader title={comp.name} sub={`Tie-breakers: ${comp.league?.tiebreakers.join(" → ").replace(/_/g, " ")}`} action={<div className="flex gap-2 text-xs">{q ? <Badge tone="accent">Continental</Badge> : null}{up ? <Badge tone="info">Promotion</Badge> : null}{down ? <Badge tone="danger">Relegation</Badge> : null}</div>} />
        <TableView world={world} rows={rows} zones={{ q, up, down }} />
      </Card>
      <Card>
        <CardHeader title="Fixtures" action={<Select label="Round" value={String(round)} onChange={(v) => setRound(Number(v))} options={rounds.map((r) => ({ value: String(r), label: `Matchday ${r}` }))} className="w-36" />} />
        {fx.map((f) => (
          <Link key={f.id} href={`/game/match/?fixture=${f.id}`} className="flex items-center gap-2 border-t border-line/60 px-4 py-2 text-sm first:border-0 hover:bg-surface2/50">
            <span className="w-12 text-xs text-muted">{shortDate(f.date)}</span>
            <span className="flex-1 truncate text-right"><ClubName world={world} id={f.homeClubId} short crest={false} /></span>
            <span className="w-16 text-center font-semibold tabular-nums">{scoreOf(world, f)}</span>
            <span className="flex-1 truncate"><ClubName world={world} id={f.awayClubId} short crest={false} /></span>
          </Link>
        ))}
      </Card>
    </div>
  );
}

function Cup({ world, cs }: { world: World; cs: CompetitionSeason }) {
  const comp = world.competitions[cs.competitionId];
  const groups = cs.groups.length ? groupTables(world, cs) : [];
  const rounds = comp.cup?.rounds ?? [];
  return (
    <div className="space-y-4">
      {cs.championId ? <Card className="p-4"><span className="text-gold">🏆 Champions:</span> <ClubName world={world} id={cs.championId} /></Card> : null}
      {groups.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => <Card key={g.name} className="overflow-auto"><CardHeader title={g.name} /><TableView world={world} rows={g.rows} zones={{ q: comp.cup?.groupStage?.advancePerGroup ?? 2, up: 0, down: 0 }} /></Card>)}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="cup-bracket">
        {rounds.map((r, ri) => {
          const ties = cs.ties.filter((t) => t.roundIndex === ri);
          return (
            <Card key={r.name}>
              <CardHeader title={r.name} sub={`${r.legs === 2 ? "Two legs" : "Single match"}${cs.roundDates[ri]?.[0] ? ` · ${shortDate(cs.roundDates[ri][0])}` : ""}`} />
              {ties.length === 0 ? <div className="p-4 text-sm text-muted">Draw not made yet.</div> : ties.map((t) => {
                const agg = tieAggregate(world, t);
                const bye = t.decidedBy === "walkover";
                return (
                  <div key={t.id} className="border-t border-line/60 px-4 py-2 text-sm first:border-0">
                    <div className="flex items-center justify-between gap-2"><span className={t.winnerId === t.homeClubId ? "font-semibold" : ""}><ClubName world={world} id={t.homeClubId} short /></span>{!bye ? <span className="tabular-nums">{agg.legsPlayed ? agg.home : ""}</span> : <Badge>Bye</Badge>}</div>
                    {!bye ? <div className="flex items-center justify-between gap-2"><span className={t.winnerId === t.awayClubId ? "font-semibold" : ""}><ClubName world={world} id={t.awayClubId} short /></span><span className="tabular-nums">{agg.legsPlayed ? agg.away : ""}</span></div> : null}
                    {t.decidedBy && !bye ? <div className="text-[11px] text-muted">{t.decidedBy.replace("_", " ")}</div> : null}
                    <div className="mt-1 flex gap-2 text-[11px]">{t.fixtureIds.map((fid) => <Link key={fid} className="text-accent hover:underline" href={`/game/match/?fixture=${fid}`}>{world.fixtures[fid].leg ? `Leg ${world.fixtures[fid].leg}` : "Match"}: {scoreOf(world, world.fixtures[fid])}</Link>)}</div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TopScorers({ world, compId }: { world: World; compId: string }) {
  const list = Object.values(world.players).filter((p) => p.seasonStats[compId]?.goals).sort((a, b) => b.seasonStats[compId].goals - a.seasonStats[compId].goals || b.seasonStats[compId].assists - a.seasonStats[compId].assists).slice(0, 10);
  if (!list.length) return null;
  return (
    <Card className="max-w-xl">
      <CardHeader title="Top scorers (current season)" />
      <table className="tbl"><thead><tr><th>Player</th><th>Club</th><th className="num">Gls</th><th className="num">Ast</th><th className="num">Apps</th></tr></thead>
        <tbody>{list.map((p) => <tr key={p.id}><td><PlayerLink p={p} /></td><td><ClubName world={world} id={p.clubId} short /></td><td className="num font-semibold">{p.seasonStats[compId].goals}</td><td className="num">{p.seasonStats[compId].assists}</td><td className="num">{p.seasonStats[compId].apps}</td></tr>)}</tbody>
      </table>
    </Card>
  );
}
