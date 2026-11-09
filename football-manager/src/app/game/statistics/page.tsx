"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Empty, Stat } from "@/components/ui/misc";
import { ClubName, PageTitle, PlayerLink } from "@/components/game/common";
import type { Player, SeasonStats } from "@/engine/core/types";

type Metric = "goals" | "assists" | "rating" | "xg" | "cleanSheets" | "tackles";

export default function StatisticsPage() {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  const [compId, setCompId] = useState(club.leagueId ?? Object.keys(world.competitions)[0]);
  const [metric, setMetric] = useState<Metric>("goals");
  const val = (s: SeasonStats): number => metric === "rating" ? (s.apps >= 3 ? s.ratingSum / s.apps : 0) : metric === "xg" ? s.xg : s[metric];
  const leaders = useMemo(() => Object.values(world.players).filter((p) => p.seasonStats[compId] && val(p.seasonStats[compId]) > 0).sort((a: Player, b: Player) => val(b.seasonStats[compId]) - val(a.seasonStats[compId])).slice(0, 15), [world, compId, metric, world.meta.currentDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const myMatches = Object.values(world.matches).filter((m) => (m.homeClubId === club.id || m.awayClubId === club.id) && world.fixtures[m.fixtureId]?.seasonId === world.meta.currentSeasonId).sort((a, b) => a.date.localeCompare(b.date));
  let pts = 0;
  const progression = myMatches.filter((m) => world.fixtures[m.fixtureId].competitionId === club.leagueId).map((m, i) => {
    const home = m.homeClubId === club.id;
    const gf = home ? m.homeGoals : m.awayGoals;
    const ga = home ? m.awayGoals : m.homeGoals;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    return { n: i + 1, points: pts };
  });
  const side = (m: (typeof myMatches)[number]) => (m.homeClubId === club.id ? 0 : 1);
  const n = myMatches.length || 1;
  const avg = (fn: (m: (typeof myMatches)[number]) => number) => myMatches.reduce((a, m) => a + fn(m), 0) / n;
  const xgChart = myMatches.slice(-15).map((m) => ({ d: m.date.slice(5), xgFor: m.stats[side(m)].xg, xgAgainst: m.stats[1 - side(m)].xg }));
  return (
    <div className="space-y-4">
      <PageTitle title="Statistics" />
      <Card><CardBody className="grid grid-cols-2 gap-6 md:grid-cols-6">
        <Stat label="Matches" value={myMatches.length} />
        <Stat label="Avg possession" value={`${avg((m) => m.stats[side(m)].possession).toFixed(0)}%`} />
        <Stat label="xG for / game" value={avg((m) => m.stats[side(m)].xg).toFixed(2)} tone="accent" />
        <Stat label="xG against / game" value={avg((m) => m.stats[1 - side(m)].xg).toFixed(2)} tone="danger" />
        <Stat label="Shots / game" value={avg((m) => m.stats[side(m)].shots).toFixed(1)} />
        <Stat label="Pass accuracy" value={`${(avg((m) => m.stats[side(m)].passesCompleted / Math.max(1, m.stats[side(m)].passes)) * 100).toFixed(0)}%`} />
      </CardBody></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader title="League points progression" /><CardBody className="h-60">{progression.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={progression}><CartesianGrid stroke="#212b38" strokeDasharray="3 3" /><XAxis dataKey="n" stroke="#8b9bb0" fontSize={10} /><YAxis stroke="#8b9bb0" fontSize={10} /><Tooltip contentStyle={{ background: "#0e131a", border: "1px solid #212b38" }} /><Line dataKey="points" stroke="#22d38b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <Empty title="No league matches yet" />}</CardBody></Card>
        <Card><CardHeader title="Expected goals (last 15 matches)" /><CardBody className="h-60">{xgChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={xgChart}><CartesianGrid stroke="#212b38" strokeDasharray="3 3" /><XAxis dataKey="d" stroke="#8b9bb0" fontSize={10} /><YAxis stroke="#8b9bb0" fontSize={10} /><Tooltip contentStyle={{ background: "#0e131a", border: "1px solid #212b38" }} /><Bar dataKey="xgFor" fill="#22d38b" /><Bar dataKey="xgAgainst" fill="#ef5350" /></BarChart></ResponsiveContainer> : <Empty title="No matches yet" />}</CardBody></Card>
      </div>
      <Card className="overflow-auto">
        <CardHeader title="Leaders" action={<>
          <Select label="Competition" value={compId} onChange={setCompId} options={Object.values(world.competitions).map((c) => ({ value: c.id, label: c.name }))} className="w-56" />
          <Select label="Metric" value={metric} onChange={(v) => setMetric(v as Metric)} options={[{ value: "goals", label: "Goals" }, { value: "assists", label: "Assists" }, { value: "rating", label: "Average rating (3+ apps)" }, { value: "xg", label: "Expected goals" }, { value: "cleanSheets", label: "Clean sheets" }, { value: "tackles", label: "Tackles" }]} className="w-48" />
        </>} />
        {leaders.length === 0 ? <Empty title="No data yet" /> : (
          <table className="tbl"><thead><tr><th>#</th><th>Player</th><th>Club</th><th className="num">Apps</th><th className="num">Value</th></tr></thead>
            <tbody>{leaders.map((p, i) => <tr key={p.id}><td className="w-8 text-muted">{i + 1}</td><td><PlayerLink p={p} /></td><td><ClubName world={world} id={p.clubId} short /></td><td className="num">{p.seasonStats[compId].apps}</td><td className="num font-semibold">{metric === "rating" || metric === "xg" ? val(p.seasonStats[compId]).toFixed(2) : val(p.seasonStats[compId])}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
