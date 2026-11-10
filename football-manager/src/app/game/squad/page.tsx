"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { HeartPulse, Ban, ArrowDown, ArrowUp } from "lucide-react";
import { useGame, useWorld } from "@/store/game";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RatingChip, Progress } from "@/components/ui/misc";
import { PageTitle, PlayerLink, PosBadge } from "@/components/game/common";
import { MiniStats } from "@/components/game/PlayerCard";
import { overall, POSITION_GROUP } from "@/engine/core/ratings";
import { ageOn } from "@/engine/core/dates";
import type { Player, TransferStatus } from "@/engine/core/types";
import { money, wage } from "@/lib/format";
import { knowledgeOf } from "@/engine/club/scouting";
import { squadCount } from "@/engine/transfers/market";

type SortKey = "pos" | "name" | "age" | "ovr" | "pot" | "fitness" | "morale" | "form" | "value" | "wage" | "contract" | "apps" | "goals";
const POS_ORDER = ["GK", "RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "RM", "LM", "AM", "RW", "LW", "ST"];

export default function SquadPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const club = world.clubs[world.meta.userClubId];
  const [group, setGroup] = useState("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "pos", dir: 1 });
  const squad = useMemo(() => Object.values(world.players).filter((p) => p.clubId === club.id && !p.retired), [world, club.id, world.meta.currentDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const loanedOut = Object.values(world.players).filter((p) => p.loanParentClubId === club.id);
  const stat = (p: Player, f: "apps" | "goals") => Object.values(p.seasonStats).reduce((a, s) => a + s[f], 0);
  const rows = squad
    .filter((p) => group === "all" || POSITION_GROUP[p.position] === group)
    .map((p) => ({ p, ovr: overall(p), age: ageOn(p.dob, world.meta.currentDate), pot: knowledgeOf(world, p).potential }))
    .sort((a, b) => {
      const d = sort.dir;
      switch (sort.k) {
        case "pos": return (POS_ORDER.indexOf(a.p.position) - POS_ORDER.indexOf(b.p.position)) * d || b.ovr - a.ovr;
        case "name": return a.p.lastName.localeCompare(b.p.lastName) * d;
        case "age": return (a.age - b.age) * d;
        case "ovr": return (a.ovr - b.ovr) * d;
        case "pot": return (a.pot[1] - b.pot[1]) * d;
        case "fitness": return (a.p.fitness - b.p.fitness) * d;
        case "morale": return (a.p.morale - b.p.morale) * d;
        case "form": return (a.p.form - b.p.form) * d;
        case "value": return (a.p.value - b.p.value) * d;
        case "wage": return ((a.p.contract?.wage ?? 0) - (b.p.contract?.wage ?? 0)) * d;
        case "contract": return (a.p.contract?.endDate ?? "").localeCompare(b.p.contract?.endDate ?? "") * d;
        case "apps": return (stat(a.p, "apps") - stat(b.p, "apps")) * d;
        case "goals": return (stat(a.p, "goals") - stat(b.p, "goals")) * d;
      }
    });
  const th = (k: SortKey, text: string, num = false) => (
    <th className={num ? "num cursor-pointer" : "cursor-pointer"} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === "name" || k === "pos" ? 1 : -1 }))} aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <span className="inline-flex items-center gap-1">{text}{sort.k === k ? (sort.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : null}</span>
    </th>
  );
  const counts = squadCount(world, club.id);
  const setStatus = (p: Player, s: TransferStatus) => mutate(() => { p.squadStatus = s; });

  return (
    <div>
      <PageTitle title="Squad" sub={`${counts.total} players · ${counts.gk} goalkeepers`} actions={<Select label="Position group" value={group} onChange={setGroup} options={[{ value: "all", label: "All positions" }, { value: "GK", label: "Goalkeepers" }, { value: "DEF", label: "Defenders" }, { value: "MID", label: "Midfielders" }, { value: "ATT", label: "Attackers" }]} className="w-44" testId="squad-filter" />} />
      <div className="space-y-2 md:hidden" data-testid="squad-cards">
        {rows.map(({ p, ovr, age, pot }) => (
          <Link key={p.id} href={`/game/player/?id=${p.id}`} className="panel flex items-center gap-3 p-3 active:bg-surface2" data-testid="squad-row-mobile">
            <div className="flex w-12 shrink-0 flex-col items-center">
              <RatingChip value={ovr} className="w-full py-1 text-base" />
              <PosBadge pos={p.position} className="mt-1 w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate font-semibold">
                {p.firstName.charAt(0)}. {p.lastName}
                {p.injury && p.injury.until > world.meta.currentDate ? <HeartPulse size={13} className="text-danger" aria-label="Injured" /> : null}
                {p.suspensions.some((x) => x.matches > 0) ? <Ban size={13} className="text-warn" aria-label="Suspended" /> : null}
                {p.squadStatus === "listed" ? <Badge tone="gold">Listed</Badge> : null}
              </div>
              <div className="text-xs text-muted">{age} yrs · POT {pot[0]}–{pot[1]} · {money(p.value)}</div>
              <div className="mt-1"><MiniStats p={p} /></div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <Progress value={p.fitness} tone={p.fitness < 70 ? "warn" : "accent"} />
                <Progress value={p.morale} tone={p.morale < 40 ? "danger" : "info"} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Card className="hidden overflow-auto md:block">
        <table className="tbl min-w-[1100px]" data-testid="squad-table">
          <thead>
            <tr>{th("pos", "Pos")}{th("name", "Name")}{th("age", "Age", true)}<th>Nat</th>{th("ovr", "Ovr", true)}{th("pot", "Pot", true)}{th("fitness", "Cond.")}{th("morale", "Morale")}{th("form", "Form", true)}{th("apps", "Apps", true)}{th("goals", "Gls", true)}{th("value", "Value", true)}{th("wage", "Wage", true)}{th("contract", "Contract")}<th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map(({ p, ovr, age, pot }) => (
              <tr key={p.id} data-testid="squad-row">
                <td><PosBadge pos={p.position} /></td>
                <td className="whitespace-nowrap">
                  <PlayerLink p={p} className="font-medium" />
                  {p.injury && p.injury.until > world.meta.currentDate ? <HeartPulse size={12} className="ml-1 inline text-danger" aria-label="Injured" /> : null}
                  {p.suspensions.some((s) => s.matches > 0) ? <Ban size={12} className="ml-1 inline text-warn" aria-label="Suspended" /> : null}
                  {p.loanParentClubId ? <Badge tone="info" className="ml-1">Loan</Badge> : null}
                  {p.generated ? <Badge className="ml-1" title="Generated player (not from the source database)">Gen</Badge> : null}
                </td>
                <td className="num">{age}</td>
                <td className="text-xs text-muted">{world.nations[p.nationId]?.code}</td>
                <td className="num"><RatingChip value={ovr} /></td>
                <td className="num text-xs text-muted">{pot[0]}–{pot[1]}</td>
                <td className="w-24"><Progress value={p.fitness} tone={p.fitness < 70 ? "warn" : "accent"} /></td>
                <td className="w-24"><Progress value={p.morale} tone={p.morale < 40 ? "danger" : "info"} /></td>
                <td className="num">{p.form.toFixed(1)}</td>
                <td className="num">{stat(p, "apps")}</td>
                <td className="num">{stat(p, "goals")}</td>
                <td className="num">{money(p.value)}</td>
                <td className="num">{p.contract ? wage(p.contract.wage) : "—"}</td>
                <td className="text-xs">{p.contract?.endDate.slice(0, 7) ?? "—"}</td>
                <td className="text-xs capitalize text-muted">{p.contract?.squadRole.replace("_", " ")}</td>
                <td>
                  {p.loanParentClubId ? <span className="text-xs text-muted">On loan</span> : (
                    <select className="field h-7 w-32 text-xs" value={p.squadStatus} onChange={(e) => setStatus(p, e.target.value as TransferStatus)} aria-label={`Transfer status for ${p.lastName}`}>
                      <option value="none">Not listed</option>
                      <option value="listed">Transfer listed</option>
                      <option value="loan_listed">Loan listed</option>
                      <option value="untouchable">Untouchable</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {loanedOut.length ? (
        <Card className="mt-4">
          <div className="panel-head"><div className="panel-title">Out on loan</div></div>
          <div className="divide-y divide-line/60">
            {loanedOut.map((p) => <div key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm"><PosBadge pos={p.position} /><PlayerLink p={p} /><span className="text-muted">at {p.clubId ? world.clubs[p.clubId].name : "—"}</span></div>)}
          </div>
        </Card>
      ) : null}
      <p className="mt-3 text-xs text-muted">Open a player for contract renewals, training focus, sales and release. Pick the starting XI on the <Link className="text-accent hover:underline" href="/game/tactics/">Tactics</Link> screen.</p>
    </div>
  );
}
