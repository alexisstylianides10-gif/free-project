"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Star, Users, Building2, Wallet, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, KV, RatingChip } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { Crest } from "@/components/game/Crest";
import { datasets, saves, useGame } from "@/store/game";
import type { Dataset } from "@/data/schema";
import type { DatasetInfo } from "@/data/datasets";
import { ratingAt } from "@/engine/core/ratings";
import { createCareer } from "@/engine/world/create";
import { money, wage } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ClubCard {
  id: string;
  name: string;
  shortName: string;
  code: string;
  colors: { primary: string; secondary: string };
  nationId: string;
  leagueId: string | null;
  reputation: number;
  capacity: number;
  stadium: string;
  balance: number;
  transferBudget: number;
  wageBudget: number;
  strength: number;
  squadSize: number;
  topPlayers: { name: string; pos: string; ovr: number }[];
}

export default function NewCareerPage() {
  const router = useRouter();
  const setWorld = useGame((s) => s.setWorld);
  const toast = useGame((s) => s.toast);
  const [libs, setLibs] = useState<DatasetInfo[] | null>(null);
  const [dsId, setDsId] = useState<string>("");
  const [ds, setDs] = useState<Dataset | null>(null);
  const [nation, setNation] = useState<string>("all");
  const [league, setLeague] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [first, setFirst] = useState("Alex");
  const [last, setLast] = useState("Morgan");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    datasets().list().then((l) => {
      setLibs(l);
      if (l[0]) setDsId(l[0].id);
    }).catch((e) => toast((e as Error).message, "error"));
  }, [toast]);

  useEffect(() => {
    if (!dsId) return;
    let cancelled = false; // ignore a slower, outdated load if the user switched database meanwhile
    setDs(null);
    setSel(null);
    setNation("all");
    setLeague("all");
    datasets().load(dsId).then((d) => { if (!cancelled) setDs(d); }).catch((e) => { if (!cancelled) toast((e as Error).message, "error"); });
    return () => { cancelled = true; };
  }, [dsId, toast]);

  const clubs = useMemo<ClubCard[]>(() => {
    if (!ds) return [];
    const stadiums = new Map(ds.stadiums.map((s) => [s.id, s]));
    const byClub = new Map<string, { name: string; pos: string; ovr: number }[]>();
    for (const p of ds.players) {
      if (!p.clubId) continue;
      const list = byClub.get(p.clubId) ?? [];
      list.push({ name: `${p.firstName} ${p.lastName}`.trim(), pos: p.position, ovr: ratingAt(p.attributes, p.position) });
      byClub.set(p.clubId, list);
    }
    return ds.clubs.map((c) => {
      const squad = (byClub.get(c.id) ?? []).sort((a, b) => b.ovr - a.ovr);
      const top = squad.slice(0, 14);
      return {
        id: c.id, name: c.name, shortName: c.shortName, code: c.code, colors: c.colors, nationId: c.nationId, leagueId: c.leagueId, reputation: c.reputation,
        capacity: stadiums.get(c.stadiumId)?.capacity ?? 0, stadium: stadiums.get(c.stadiumId)?.name ?? "—", balance: c.finance.balance, transferBudget: c.finance.transferBudget,
        wageBudget: c.finance.wageBudget, strength: top.length ? Math.round(top.reduce((a, b) => a + b.ovr, 0) / top.length) : 0, squadSize: squad.length, topPlayers: squad.slice(0, 5),
      };
    });
  }, [ds]);

  const nationsWithLeagues = useMemo(() => (ds ? ds.nations.filter((n) => ds.competitions.some((c) => c.type === "league" && c.nationId === n.id)) : []), [ds]);
  const leagues = useMemo(() => (ds ? ds.competitions.filter((c) => c.type === "league" && (nation === "all" || c.nationId === nation)).sort((a, b) => (a.nationId ?? "").localeCompare(b.nationId ?? "") || a.tier - b.tier) : []), [ds, nation]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clubs
      .filter((c) => (nation === "all" || c.nationId === nation) && (league === "all" || c.leagueId === league) && (!needle || c.name.toLowerCase().includes(needle) || c.shortName.toLowerCase().includes(needle)))
      .sort((a, b) => b.reputation - a.reputation);
  }, [clubs, nation, league, q]);
  const selected = clubs.find((c) => c.id === sel) ?? null;
  const info = libs?.find((l) => l.id === dsId);
  const leagueName = (id: string | null) => ds?.competitions.find((c) => c.id === id)?.name ?? "No league";
  const nationName = (id: string) => ds?.nations.find((n) => n.id === id)?.name ?? id;
  const leagueRank = (c: ClubCard) => {
    const same = clubs.filter((x) => x.leagueId === c.leagueId).sort((a, b) => b.strength * 2 + b.reputation * 0.3 - (a.strength * 2 + a.reputation * 0.3));
    return { rank: same.findIndex((x) => x.id === c.id) + 1, of: same.length };
  };

  const start = async () => {
    if (!ds || !selected) return;
    if (!last.trim()) {
      toast("Please enter your manager's surname.", "warn");
      return;
    }
    setStarting(true);
    await new Promise((r) => setTimeout(r, 20));
    try {
      const world = createCareer(ds, { clubId: selected.id, managerFirstName: first.trim(), managerLastName: last.trim(), saveName: `${selected.shortName} – ${first.trim()} ${last.trim()}`.trim() });
      const meta = await saves().save(world, { kind: "manual" });
      setWorld(world, meta.id);
      router.push("/game/");
    } catch (e) {
      toast(`Could not start the career: ${(e as Error).message}`, "error");
      setStarting(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg" aria-label="Back to menu">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Choose your club</h1>
            <p className="text-sm text-muted">Select an existing club. Every other club in the world will be run by the AI.</p>
          </div>
        </div>
        {libs && libs.length > 1 ? <Select label="Database" value={dsId} onChange={setDsId} options={libs.map((l) => ({ value: l.id, label: `${l.name} (${l.season})` }))} className="w-72" /> : null}
      </div>
      {info && !info.isReal ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm" data-testid="fictional-banner">
          <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={16} />
          <div>
            <span className="font-medium text-warn">{info.name}</span> — {info.coverageNote || "Fictional development data."} Clubs, players, staff and stadiums in this database are invented and do not represent real-world records.
          </div>
        </div>
      ) : info?.isReal ? (
        <div className="mb-4 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-info" data-testid="coverage-banner">
          <span className="font-medium">{info.name}.</span> {info.coverageNote}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <Input placeholder="Search clubs…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="club-search" aria-label="Search clubs" />
            </div>
            <Select label="Country" value={nation} onChange={(v) => { setNation(v); setLeague("all"); }} options={[{ value: "all", label: "All countries" }, ...nationsWithLeagues.map((n) => ({ value: n.id, label: n.name }))]} className="w-44" testId="filter-country" />
            <Select label="League" value={league} onChange={setLeague} options={[{ value: "all", label: "All leagues" }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]} className="w-56" testId="filter-league" />
          </div>
          {!ds ? (
            <div className="flex items-center justify-center gap-2 p-16 text-muted"><Loader2 className="animate-spin" size={18} /> Loading database…</div>
          ) : (
            <div className="grid max-h-[68vh] grid-cols-1 gap-2 overflow-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <button key={c.id} type="button" onClick={() => setSel(c.id)} data-testid={`club-${c.id}`} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition", sel === c.id ? "border-accent bg-accent/10" : "border-line bg-surface2/40 hover:border-muted/40 hover:bg-surface2")}>
                  <Crest club={c} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted">{leagueName(c.leagueId)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Stars rep={c.reputation} />
                    <RatingChip value={c.strength} title="Squad strength (avg of best 14)" />
                  </div>
                </button>
              ))}
              {filtered.length === 0 ? <div className="col-span-full p-10 text-center text-sm text-muted">No clubs match your filters.</div> : null}
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Club information" />
            {selected ? (
              <CardBody>
                <div className="mb-4 flex items-center gap-3">
                  <Crest club={selected} size={46} />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold" data-testid="selected-club-name">{selected.name}</div>
                    <div className="text-sm text-muted">{leagueName(selected.leagueId)} · {nationName(selected.nationId)}</div>
                  </div>
                </div>
                <KV k={<span className="flex items-center gap-1.5"><Star size={13} /> Reputation</span>} v={<Stars rep={selected.reputation} />} />
                <KV k={<span className="flex items-center gap-1.5"><Building2 size={13} /> Stadium</span>} v={`${selected.stadium} (${selected.capacity.toLocaleString()})`} />
                <KV k={<span className="flex items-center gap-1.5"><Wallet size={13} /> Balance</span>} v={money(selected.balance)} />
                <KV k="Transfer budget" v={money(selected.transferBudget)} />
                <KV k="Wage budget" v={wage(selected.wageBudget)} />
                <KV k={<span className="flex items-center gap-1.5"><Users size={13} /> Squad</span>} v={`${selected.squadSize} players · strength ${selected.strength}`} />
                <KV k="Expected league finish" v={(() => { const r = leagueRank(selected); return `${r.rank} of ${r.of}`; })()} />
                <div className="mt-3 border-t border-line pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Key players</div>
                  {selected.topPlayers.map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-1 text-sm">
                      <span className="truncate">{p.name} <span className="text-xs text-muted">{p.pos}</span></span>
                      <RatingChip value={p.ovr} />
                    </div>
                  ))}
                  {selected.squadSize < 18 ? <div className="mt-2 text-xs text-warn">Incomplete squad data: missing places will be filled with generated players marked “Generated”.</div> : null}
                </div>
              </CardBody>
            ) : (
              <CardBody className="text-sm text-muted">Select a club to see its details.</CardBody>
            )}
          </Card>
          <Card>
            <CardHeader title="Manager" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="mgr-first">First name</label>
                  <Input id="mgr-first" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={30} />
                </div>
                <div>
                  <label className="label" htmlFor="mgr-last">Surname</label>
                  <Input id="mgr-last" value={last} onChange={(e) => setLast(e.target.value)} maxLength={30} />
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full" disabled={!selected || starting} onClick={start} data-testid="start-career">
                {starting ? <><Loader2 className="animate-spin" size={16} /> Building the world…</> : selected ? `Take charge of ${selected.shortName}` : "Select a club"}
              </Button>
              {info ? <div className="text-center text-xs text-muted">Database: {info.name} {info.isReal ? null : <Badge tone="warn">Fictional</Badge>}</div> : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stars({ rep }: { rep: number }) {
  const n = Math.max(0.5, Math.min(5, Math.round((rep / 20) * 2) / 2));
  return (
    <span className="inline-flex items-center gap-0.5 text-gold" title={`Reputation ${rep}/100`} aria-label={`Reputation ${rep} of 100`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={11} className={i < Math.floor(n) ? "fill-gold" : i < n ? "fill-gold/50" : "opacity-30"} />
      ))}
    </span>
  );
}
