"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Empty, Input, RatingChip } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubName, PageTitle, PlayerLink, PosBadge } from "@/components/game/common";
import { NegotiationDialog } from "@/components/game/Negotiation";
import { ATTRIBUTE_KEYS, POSITIONS, type AttributeKey } from "@/engine/core/types";
import { overall } from "@/engine/core/ratings";
import { ageOn } from "@/engine/core/dates";
import { knowledgeOf, startScouting } from "@/engine/club/scouting";
import { acceptIncomingBid, counterIncomingBid, rejectIncomingBid } from "@/engine/ai/clubAI";
import { daysLeftInWindow } from "@/engine/transfers/market";
import { date, label, money, wage } from "@/lib/format";

export default function TransfersPage() {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  const win = daysLeftInWindow(world);
  const incoming = Object.values(world.negotiations).filter((n) => n.incoming && n.status === "open");
  return (
    <div>
      <PageTitle title="Transfers" sub={`Budget ${money(club.finance.transferBudget)} · ${win !== null ? `window open (${win} days left)` : "window closed — free agents can still be signed"}`} />
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search" data-testid="tab-search">Player search</TabsTrigger>
          <TabsTrigger value="offers" data-testid="tab-offers">Offers & talks {incoming.length ? <Badge tone="accent" className="ml-1">{incoming.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="scouting">Scouting</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="search"><PlayerSearch /></TabsContent>
        <TabsContent value="offers"><Offers /></TabsContent>
        <TabsContent value="scouting"><Scouting /></TabsContent>
        <TabsContent value="history"><History /></TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerSearch() {
  const world = useWorld();
  const uc = world.meta.userClubId;
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("any");
  const [ageMin, setAgeMin] = useState(15);
  const [ageMax, setAgeMax] = useState(40);
  const [nation, setNation] = useState("any");
  const [league, setLeague] = useState("any");
  const [clubF, setClubF] = useState("any");
  const [maxValue, setMaxValue] = useState(0);
  const [minOvr, setMinOvr] = useState(0);
  const [minPot, setMinPot] = useState(0);
  const [expiring, setExpiring] = useState(false);
  const [maxWage, setMaxWage] = useState(0);
  const [status, setStatus] = useState("any");
  const [attr, setAttr] = useState<AttributeKey | "none">("none");
  const [attrMin, setAttrMin] = useState(12);
  const [neg, setNeg] = useState<{ id: string; mode: "buy" | "loan" } | null>(null);
  const today = world.meta.currentDate;
  const season = world.seasons[world.meta.currentSeasonId];
  const leagues = Object.values(world.competitions).filter((c) => c.type === "league");
  const clubsInLeague = Object.values(world.clubs).filter((c) => league === "any" || c.leagueId === league).sort((a, b) => a.name.localeCompare(b.name));
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = [];
    for (const p of Object.values(world.players)) {
      if (p.retired || p.clubId === uc) continue;
      if (needle && !`${p.firstName} ${p.lastName}`.toLowerCase().includes(needle)) continue;
      if (pos !== "any" && p.position !== pos && !p.altPositions.includes(pos as never)) continue;
      const age = ageOn(p.dob, today);
      if (age < ageMin || age > ageMax) continue;
      if (nation !== "any" && p.nationId !== nation) continue;
      const c = p.clubId ? world.clubs[p.clubId] : null;
      if (league !== "any" && c?.leagueId !== league) continue;
      if (clubF === "free" && p.clubId) continue;
      if (clubF !== "any" && clubF !== "free" && p.clubId !== clubF) continue;
      if (maxValue && p.value > maxValue) continue;
      if (maxWage && (p.contract?.wage ?? 0) > maxWage) continue;
      if (expiring && (!p.contract || p.contract.endDate > season.endDate)) continue;
      if (status !== "any" && p.squadStatus !== status) continue;
      const k = knowledgeOf(world, p);
      const shownOvr = k.exact ? overall(p) : k.overall[1];
      if (minOvr && shownOvr < minOvr) continue;
      if (minPot && k.potential[1] < minPot) continue;
      if (attr !== "none" && k.exact && p.attributes[attr] < attrMin) continue;
      if (attr !== "none" && !k.exact) continue;
      out.push({ p, age, k });
      if (out.length > 400) break;
    }
    return out.sort((a, b) => (b.k.exact ? overall(b.p) : b.k.overall[1]) - (a.k.exact ? overall(a.p) : a.k.overall[1])).slice(0, 150);
  }, [world, uc, q, pos, ageMin, ageMax, nation, league, clubF, maxValue, minOvr, minPot, expiring, maxWage, status, attr, attrMin, today, season.endDate]);

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader title="Filters" />
        <CardBody className="space-y-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} /><Input className="pl-8" placeholder="Name…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-name" /></div>
          <div><label className="label">Position</label><Select value={pos} onChange={setPos} options={[{ value: "any", label: "Any" }, ...POSITIONS.map((p) => ({ value: p, label: p }))]} testId="search-position" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Min age</label><Input type="number" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} /></div>
            <div><label className="label">Max age</label><Input type="number" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} /></div>
          </div>
          <div><label className="label">Nationality</label><Select value={nation} onChange={setNation} options={[{ value: "any", label: "Any" }, ...Object.values(world.nations).map((n) => ({ value: n.id, label: n.name }))]} /></div>
          <div><label className="label">League</label><Select value={league} onChange={(v) => { setLeague(v); setClubF("any"); }} options={[{ value: "any", label: "Any" }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]} /></div>
          <div><label className="label">Club</label><Select value={clubF} onChange={setClubF} options={[{ value: "any", label: "Any" }, { value: "free", label: "Free agents only" }, ...clubsInLeague.filter((c) => c.id !== uc).map((c) => ({ value: c.id, label: c.name }))]} testId="search-club" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Min ability</label><Input type="number" value={minOvr} onChange={(e) => setMinOvr(Number(e.target.value))} /></div>
            <div><label className="label">Min potential</label><Input type="number" value={minPot} onChange={(e) => setMinPot(Number(e.target.value))} /></div>
            <div><label className="label">Max value</label><Input type="number" step={1_000_000} value={maxValue || ""} placeholder="Any" onChange={(e) => setMaxValue(Number(e.target.value))} /></div>
            <div><label className="label">Max wage/wk</label><Input type="number" step={1000} value={maxWage || ""} placeholder="Any" onChange={(e) => setMaxWage(Number(e.target.value))} /></div>
          </div>
          <div><label className="label">Transfer status</label><Select value={status} onChange={setStatus} options={[{ value: "any", label: "Any" }, { value: "listed", label: "Transfer listed" }, { value: "loan_listed", label: "Loan listed" }]} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={expiring} onChange={(e) => setExpiring(e.target.checked)} /> Contract expires this season</label>
          <div className="grid grid-cols-[1fr_70px] gap-2">
            <div><label className="label">Attribute</label><Select value={attr} onChange={(v) => setAttr(v as AttributeKey | "none")} options={[{ value: "none", label: "Any" }, ...ATTRIBUTE_KEYS.map((a) => ({ value: a, label: label(a.replace(/([A-Z])/g, " $1")) }))]} /></div>
            <div><label className="label">Min</label><Input type="number" min={1} max={20} value={attrMin} onChange={(e) => setAttrMin(Number(e.target.value))} /></div>
          </div>
        </CardBody>
      </Card>
      <Card className="overflow-auto">
        <CardHeader title={`${results.length}${results.length === 150 ? "+" : ""} players`} sub="Unscouted players show estimated ranges." />
        {results.length === 0 ? <Empty title="No players match" /> : (
          <table className="tbl min-w-[900px]" data-testid="search-results">
            <thead><tr><th>Pos</th><th>Name</th><th className="num">Age</th><th>Club</th><th className="num">Ability</th><th className="num">Potential</th><th className="num">Value</th><th className="num">Wage</th><th>Contract</th><th /></tr></thead>
            <tbody>
              {results.map(({ p, age, k }) => (
                <tr key={p.id}>
                  <td><PosBadge pos={p.position} /></td>
                  <td className="whitespace-nowrap"><PlayerLink p={p} />{p.squadStatus === "listed" ? <Badge tone="gold" className="ml-1">Listed</Badge> : p.squadStatus === "loan_listed" ? <Badge tone="info" className="ml-1">Loan</Badge> : null}</td>
                  <td className="num">{age}</td>
                  <td className="max-w-[160px]"><ClubName world={world} id={p.clubId} short /></td>
                  <td className="num"><RatingChip value={k.exact ? overall(p) : `${k.overall[0]}-${k.overall[1]}`} /></td>
                  <td className="num text-xs text-muted">{k.potential[0]}–{k.potential[1]}</td>
                  <td className="num">{money(p.value)}</td>
                  <td className="num">{p.contract ? wage(p.contract.wage) : "—"}</td>
                  <td className="text-xs">{p.contract?.endDate.slice(0, 7) ?? "Free"}</td>
                  <td className="whitespace-nowrap text-right">
                    {p.clubId && !p.loanParentClubId ? <Button size="sm" variant="ghost" onClick={() => setNeg({ id: p.id, mode: "loan" })}>Loan</Button> : null}
                    <Button size="sm" variant="outline" onClick={() => setNeg({ id: p.id, mode: "buy" })} data-testid={`bid-${p.id}`} disabled={!!p.loanParentClubId}>{p.clubId ? "Bid" : "Sign"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {neg ? <NegotiationDialog playerId={neg.id} mode={neg.mode} open onClose={() => setNeg(null)} /> : null}
    </div>
  );
}

function Offers() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const [counter, setCounter] = useState<Record<string, number>>({});
  const uc = world.meta.userClubId;
  const incoming = Object.values(world.negotiations).filter((n) => n.incoming && n.status === "open");
  const mine = Object.values(world.negotiations).filter((n) => n.buyingClubId === uc).sort((a, b) => b.updatedDate.localeCompare(a.updatedDate));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Offers for your players" />
        {incoming.length === 0 ? <Empty title="No offers">List players on the Squad screen to attract bids.</Empty> : incoming.map((n) => {
          const p = world.players[n.playerId];
          const o = n.counterTransfer!;
          return (
            <div key={n.id} className="border-t border-line/60 p-4 first:border-0" data-testid="incoming-offer">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><PlayerLink p={p} className="font-medium" /> <span className="text-sm text-muted">· value {money(p.value)}</span></div>
                <ClubName world={world} id={n.buyingClubId} />
              </div>
              <div className="mt-1 text-sm">{o.type === "permanent" ? <>Fee <b>{money(o.fee)}</b>{o.upfrontPct < 100 ? ` (${o.upfrontPct}% upfront)` : ""}{o.addOnAppearances ? ` + ${money(o.addOnAppearances)} after 25 apps` : ""}</> : <>Loan until {o.loanEndDate}, fee {money(o.loanFee)}, they pay {o.loanWageSharePct}% of wages</>}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" onClick={() => { const r = mutate((w) => acceptIncomingBid(w, n.id)); toast(r.message, r.ok ? "success" : "error"); }} data-testid="accept-offer">Accept</Button>
                {o.type === "permanent" ? <>
                  <Input type="number" step={500_000} className="h-8 w-36" value={counter[n.id] ?? Math.round(o.fee * 1.25)} onChange={(e) => setCounter({ ...counter, [n.id]: Number(e.target.value) })} aria-label="Counter fee" />
                  <Button size="sm" onClick={() => { const r = mutate((w) => counterIncomingBid(w, n.id, counter[n.id] ?? Math.round(o.fee * 1.25))); toast(r.message, r.ok ? "info" : "warn"); }}>Counter</Button>
                </> : null}
                <Button size="sm" variant="ghost" onClick={() => mutate((w) => rejectIncomingBid(w, n.id))}>Reject</Button>
              </div>
            </div>
          );
        })}
      </Card>
      <Card>
        <CardHeader title="Your negotiations" />
        {mine.length === 0 ? <Empty title="No negotiations yet" /> : (
          <table className="tbl"><thead><tr><th>Player</th><th>Type</th><th>Status</th><th>Last update</th></tr></thead>
            <tbody>{mine.map((n) => <tr key={n.id}><td><PlayerLink p={world.players[n.playerId]} /></td><td className="text-xs">{label(n.kind)}</td><td><Badge tone={n.status === "completed" ? "accent" : ["rejected", "expired", "withdrawn"].includes(n.status) ? "danger" : "info"}>{label(n.status)}</Badge></td><td className="text-xs text-muted">{n.rounds[n.rounds.length - 1]?.message ?? date(n.updatedDate)}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Scouting() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const uc = world.meta.userClubId;
  const [target, setTarget] = useState("");
  const assignments = Object.values(world.scouting).filter((s) => s.clubId === uc).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const scouts = Object.values(world.staff).filter((s) => s.clubId === uc && (s.role === "scout" || s.role === "head_of_recruitment"));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader title="New assignment" sub={`${scouts.length} scouting staff`} />
        <CardBody className="space-y-3">
          <Select label="Scouting target" value={target} onChange={setTarget} options={[{ value: "", label: "Choose a country or league…" }, ...Object.values(world.nations).map((n) => ({ value: `n:${n.id}`, label: `Country: ${n.name}` })), ...Object.values(world.competitions).filter((c) => c.type === "league").map((c) => ({ value: `c:${c.id}`, label: `League: ${c.name}` }))]} />
          <Button variant="primary" disabled={!target} onClick={() => { const [k, id] = target.split(":"); const r = mutate((w) => startScouting(w, uc, k === "n" ? { kind: "nation", nationId: id } : { kind: "competition", competitionId: id })); toast(r.message, r.ok ? "success" : "error"); }}>Send scouts</Button>
          <p className="text-xs text-muted">Scouted players show exact attributes. Better scouts finish faster and estimate potential more accurately. Single players can be scouted from their profile.</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Assignments & reports" />
        {assignments.length === 0 ? <Empty title="No scouting assignments" /> : assignments.map((a) => (
          <div key={a.id} className="border-t border-line/60 p-4 text-sm first:border-0">
            <div className="flex items-center justify-between">
              <span className="font-medium">{a.target.kind === "player" ? world.players[a.target.playerId]?.lastName : a.target.kind === "nation" ? world.nations[a.target.nationId]?.name : world.competitions[a.target.competitionId]?.name}</span>
              <Badge tone={a.status === "completed" ? "accent" : "info"}>{a.status === "completed" ? "Report ready" : `Due ${date(a.endDate)}`}</Badge>
            </div>
            {a.status === "completed" ? <div className="mt-2 flex flex-wrap gap-1.5">{a.reportPlayerIds.slice(0, 20).map((id) => world.players[id] ? <span key={id} className="chip"><PlayerLink p={world.players[id]} /> <RatingChip value={overall(world.players[id])} /></span> : null)}</div> : null}
          </div>
        ))}
      </Card>
    </div>
  );
}

function History() {
  const world = useWorld();
  const [scope, setScope] = useState("mine");
  const uc = world.meta.userClubId;
  const list = world.transfers.filter((t) => t.type !== "retirement" && (scope === "all" ? t.fee > 0 || t.type === "loan" : t.fromClubId === uc || t.toClubId === uc)).slice().reverse().slice(0, 200);
  return (
    <Card className="overflow-auto">
      <CardHeader title="Transfer history" action={<Select value={scope} onChange={setScope} options={[{ value: "mine", label: "My club" }, { value: "all", label: "Whole world (fees & loans)" }]} className="w-56" />} />
      {list.length === 0 ? <Empty title="No transfers yet" /> : (
        <table className="tbl"><thead><tr><th>Date</th><th>Player</th><th>From</th><th>To</th><th>Type</th><th className="num">Fee</th></tr></thead>
          <tbody>{list.map((t) => <tr key={t.id}><td className="text-xs">{date(t.date)}</td><td>{world.players[t.playerId] ? <PlayerLink p={world.players[t.playerId]} /> : "—"}</td><td><ClubName world={world} id={t.fromClubId} short /></td><td><ClubName world={world} id={t.toClubId} short /></td><td className="text-xs">{label(t.type)}</td><td className="num">{t.fee ? money(t.fee) : "—"}</td></tr>)}</tbody>
        </table>
      )}
    </Card>
  );
}
