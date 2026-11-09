"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorld } from "@/store/game";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/misc";
import { ClubName, FormDots, PageTitle, resultFor, scoreOf } from "@/components/game/common";
import { longDate } from "@/lib/format";

export default function MatchesPage() {
  const world = useWorld();
  const uc = world.meta.userClubId;
  const [comp, setComp] = useState("all");
  const [season, setSeason] = useState(world.meta.currentSeasonId);
  const fixtures = Object.values(world.fixtures).filter((f) => (f.homeClubId === uc || f.awayClubId === uc) && f.seasonId === season && (comp === "all" || f.competitionId === comp)).sort((a, b) => a.date.localeCompare(b.date));
  const comps = Array.from(new Set(Object.values(world.fixtures).filter((f) => f.seasonId === season && (f.homeClubId === uc || f.awayClubId === uc)).map((f) => f.competitionId)));
  return (
    <div>
      <PageTitle title="Matches" sub="Fixtures and results for every competition" actions={<>
        <Select label="Season" value={season} onChange={setSeason} options={Object.values(world.seasons).map((s) => ({ value: s.id, label: s.label }))} className="w-32" />
        <Select label="Competition" value={comp} onChange={setComp} options={[{ value: "all", label: "All competitions" }, ...comps.map((c) => ({ value: c, label: world.competitions[c].name }))]} className="w-56" />
      </>} />
      <Card className="overflow-auto">
        {fixtures.length === 0 ? <Empty title="No fixtures" /> : (
          <table className="tbl" data-testid="fixtures-table">
            <thead><tr><th>Date</th><th>Competition</th><th>Round</th><th>Opponent</th><th>Venue</th><th className="num">Score</th><th /></tr></thead>
            <tbody>
              {fixtures.map((f) => {
                const opp = f.homeClubId === uc ? f.awayClubId : f.homeClubId;
                const r = resultFor(world, f, uc);
                const today = f.date === world.meta.currentDate && f.status === "scheduled";
                return (
                  <tr key={f.id} className={today ? "bg-gold/5" : ""}>
                    <td className="whitespace-nowrap text-xs">{longDate(f.date)}</td>
                    <td className="text-xs">{world.competitions[f.competitionId].shortName}</td>
                    <td className="text-xs text-muted">{f.roundName}</td>
                    <td><ClubName world={world} id={opp} /></td>
                    <td className="text-xs">{f.homeClubId === uc ? "Home" : "Away"}</td>
                    <td className="num font-semibold">{scoreOf(world, f)}</td>
                    <td className="text-right">{r ? <FormDots form={[r]} /> : today ? <Badge tone="gold">Today</Badge> : null} <Link className="ml-2 text-xs text-accent hover:underline" href={`/game/match/?fixture=${f.id}`}>{f.status === "played" ? "Report" : "Preview"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
