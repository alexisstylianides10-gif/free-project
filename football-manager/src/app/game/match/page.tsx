"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pause, Play, Zap, Repeat2, FastForward, SkipForward } from "lucide-react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Empty, RatingChip } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { overall } from "@/engine/core/ratings";
import { Crest } from "@/components/game/Crest";
import { MatchPitch, replayDots, type PitchDot } from "@/components/game/MatchPitch";
import type { Fixture, Level, MatchEvent, MatchRecord, PlayerMatchLine, TeamMatchStats, World } from "@/engine/core/types";
import type { MatchSimulation } from "@/engine/match/engine";
import { applyMatchResult, createMatchSimulation } from "@/engine/world/matchday";
import { validateSelection } from "@/engine/tactics/selection";
import { longDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchView />
    </Suspense>
  );
}

function MatchView() {
  const id = useSearchParams().get("fixture") ?? "";
  const world = useWorld();
  const f = world.fixtures[id];
  if (!f) return <Empty title="Fixture not found" />;
  if (f.status === "played" && f.matchId) return <MatchReview world={world} f={f} m={world.matches[f.matchId]} />;
  const isToday = f.date === world.meta.currentDate;
  const userInvolved = f.homeClubId === world.meta.userClubId || f.awayClubId === world.meta.userClubId;
  if (isToday && userInvolved) return <PreMatchAndLive f={f} />;
  return <Preview world={world} f={f} />;
}

function Header({ world, f, score, minute, live }: { world: World; f: Fixture; score?: [number, number]; minute?: string; live?: boolean }) {
  const h = world.clubs[f.homeClubId];
  const a = world.clubs[f.awayClubId];
  const comp = world.competitions[f.competitionId];
  return (
    <Card className="mb-3 overflow-hidden">
      <div className="truncate border-b border-line px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-muted">{comp.name} · {f.roundName}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:justify-end sm:text-right"><span className="order-2 w-full truncate text-sm font-semibold sm:order-1 sm:text-xl">{h.shortName}</span><span className="order-1 sm:order-2"><Crest club={h} size={36} /></span></div>
        <div className="text-center">
          <div className="text-3xl font-black tabular-nums sm:text-4xl" data-testid="scoreboard">{score ? `${score[0]} – ${score[1]}` : "vs"}</div>
          <div className="text-xs text-muted">{minute ? <span className={live ? "font-semibold text-accent" : ""}>{minute}</span> : longDate(f.date)}</div>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:text-left"><Crest club={a} size={36} /><span className="w-full truncate text-sm font-semibold sm:text-xl">{a.shortName}</span></div>
      </div>
    </Card>
  );
}

function Preview({ world, f }: { world: World; f: Fixture }) {
  return (
    <div>
      <Header world={world} f={f} />
      <Card><CardBody className="text-sm text-muted">This match takes place on {longDate(f.date)}. Prepare your team on the <Link className="text-accent hover:underline" href="/game/tactics/">Tactics</Link> screen.</CardBody></Card>
    </div>
  );
}

function PreMatchAndLive({ f }: { f: Fixture }) {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const router = useRouter();
  const simRef = useRef<MatchSimulation | null>(null);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [started, setStarted] = useState(false);
  const userSide: 0 | 1 = f.homeClubId === world.meta.userClubId ? 0 : 1;
  const club = world.clubs[world.meta.userClubId];
  const comp = world.competitions[f.competitionId];
  const issues = club.selection ? validateSelection(world, club, club.selection, comp, f.date) : [];
  const errors = issues.filter((i) => i.level === "error");

  const finish = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const r = sim.simulateToEnd();
    mutate((w) => applyMatchResult(w, f.id, r, true));
    toast("Full time. The result has been recorded.", "success");
  }, [f.id, mutate, toast]);

  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      sim.stepTo((sim.matchClockSeconds + speed) / 60);
      setTick((t) => t + 1);
      if (sim.finished) {
        setRunning(false);
        finish();
      }
    }, 400);
    return () => clearInterval(h);
  }, [running, speed, finish]);

  const start = (live: boolean) => {
    simRef.current = createMatchSimulation(world, f.id, { userManual: live, detailed: true });
    setStarted(true);
    if (live) setRunning(true);
    else finish();
  };

  if (!started) {
    return (
      <div>
        <Header world={world} f={f} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pre-match" />
            <CardBody className="space-y-3 text-sm">
              {errors.length ? <div className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-warn">Your selection has problems ({errors[0].message}). {club.selection?.autoFill ? "The assistant will fill the gaps automatically." : "Fix it on the Tactics screen."}</div> : <div className="text-accent">Your team is ready.</div>}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" onClick={() => start(true)} data-testid="play-live"><Play size={16} /> Play live</Button>
                <Button size="lg" onClick={() => start(false)} data-testid="instant-result"><Zap size={16} /> Instant result</Button>
                <Button size="lg" variant="ghost" onClick={() => router.push("/game/tactics/")}>Edit tactics</Button>
              </div>
              <p className="text-muted">Live mode shows a 2D view with commentary. You can pause, change speed, make substitutions and change tactics at any time.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
  const sim = simRef.current!;
  if (f.status === "played" && f.matchId) {
    return (
      <div>
        <MatchReview world={world} f={f} m={world.matches[f.matchId]} />
        <div className="mt-4 flex justify-end"><Button variant="primary" onClick={() => router.push("/game/")} data-testid="back-to-dashboard">Back to dashboard</Button></div>
      </div>
    );
  }
  void tick;
  const snap = sim.snapshot();
  const minute = `${sim.minute}'${sim.period >= 3 && sim.period <= 4 ? " (ET)" : ""}`;
  const home = world.clubs[f.homeClubId];
  const away = world.clubs[f.awayClubId];
  const dots: PitchDot[] = snap.players.map((p) => ({ id: p.id, side: p.side, x: p.x, y: p.y, label: p.name.slice(0, 12), hasBall: p.hasBall, number: p.number }));
  const lastGoal = [...sim.events].reverse().find((e) => e.type === "goal");
  const goalBanner = lastGoal && sim.matchClockSeconds - (lastGoal.minute * 60 + lastGoal.second) < 75 ? "GOAL!" : null;
  const view = sim.teamView(userSide);
  const lastEvents = sim.events.slice(-40).reverse();
  const highlight = [...sim.events].reverse().find((e) => ["goal", "yellow", "red", "second_yellow", "substitution", "injury", "penalty", "half_time"].includes(e.type));
  return (
    <div>
      <Header world={world} f={f} score={sim.goals} minute={minute} live />
      <div className="grid gap-3 xl:grid-cols-[1fr_400px]">
        <div className="space-y-2">
          <div className="-mx-4 sm:mx-0"><MatchPitch dots={dots} ball={snap.ball} banner={goalBanner} homeColor={home.kits[0]?.primary ?? home.colors.primary} awayColor={(away.kits.find((k) => k.slot === "away") ?? away.kits[0])?.primary ?? away.colors.primary} /></div>
          <div className="truncate rounded-lg border border-line bg-surface px-3 py-2 text-sm" data-testid="last-event">
            {lastEvents[0] ? <><span className="mr-2 tabular-nums text-muted">{lastEvents[0].minute}&apos;</span>{lastEvents[0].text}</> : "Kick-off"}
          </div>
          {highlight && highlight !== lastEvents[0] ? <div className="truncate px-1 text-xs text-muted">Last key moment: {highlight.minute}&apos; {highlight.text}</div> : null}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button variant={running ? "secondary" : "primary"} onClick={() => setRunning((r) => !r)} data-testid="live-pause">{running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}</Button>
            <Select label="Speed" value={String(speed)} onChange={(v) => setSpeed(Number(v))} options={[{ value: "10", label: "Slow" }, { value: "30", label: "Normal" }, { value: "90", label: "Fast" }, { value: "300", label: "Turbo" }]} className="sm:w-32" />
            <Button onClick={() => { setRunning(false); finish(); }} data-testid="sim-to-end"><SkipForward size={14} /> To end</Button>
          </div>
        </div>
        <Tabs defaultValue="commentary">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="commentary">Live</TabsTrigger>
            <TabsTrigger value="subs" data-testid="tab-subs">Subs ({view.subsLeft})</TabsTrigger>
            <TabsTrigger value="tactics" data-testid="tab-live-tactics">Tactics</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="commentary" className="mt-2">
            <Card><div className="max-h-[50vh] overflow-auto px-4 py-2 text-sm" data-testid="commentary">{lastEvents.map((e, i) => <EventLine key={i} e={e} />)}</div></Card>
          </TabsContent>
          <TabsContent value="subs" className="mt-2"><LiveSubs sim={sim} side={userSide} onChange={() => setTick((t) => t + 1)} toast={toast} /></TabsContent>
          <TabsContent value="tactics" className="mt-2"><LiveTactics sim={sim} side={userSide} onChange={() => setTick((t) => t + 1)} /></TabsContent>
          <TabsContent value="stats" className="mt-2"><LiveStats sim={sim} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LiveTactics({ sim, side, onChange }: { sim: MatchSimulation; side: 0 | 1; onChange: () => void }) {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  const view = sim.teamView(side);
  const t = view.tactic;
  const apply = (fn: (x: typeof t) => void) => {
    const copy = JSON.parse(JSON.stringify(t));
    fn(copy);
    sim.changeTactic(side, copy);
    onChange();
  };
  return (
    <Card>
      <CardHeader title="Touchline instructions" />
      <CardBody className="space-y-3 text-sm">
        <div>
          <label className="label">Switch tactical system</label>
          <Select value={t.id} onChange={(v) => { const nt = club.tactics.find((x) => x.id === v); if (nt) { sim.changeTactic(side, nt); onChange(); } }} options={club.tactics.map((x) => ({ value: x.id, label: `${x.name} (${x.formationLabel})` }))} testId="live-tactic" />
        </div>
        {([["mentality", "Mentality"], ["pressing", "Pressing"], ["defensiveLine", "Defensive line"], ["tempo", "Tempo"]] as const).map(([k, n]) => (
          <div key={k}><div className="mb-1 text-xs text-muted">{n}</div><Slider value={t.team[k]} onChange={(v) => apply((x) => { x.team[k] = v as Level; })} label={n} testId={`live-${k}`} /></div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <Select label="Attacking transition" value={t.team.attackingTransition} onChange={(v) => apply((x) => { x.team.attackingTransition = v; })} options={[{ value: "counter", label: "Counter" }, { value: "balanced", label: "Balanced" }, { value: "hold_shape", label: "Hold shape" }]} />
          <Select label="Defensive transition" value={t.team.defensiveTransition} onChange={(v) => apply((x) => { x.team.defensiveTransition = v; })} options={[{ value: "counter_press", label: "Counter-press" }, { value: "balanced", label: "Balanced" }, { value: "regroup", label: "Regroup" }]} />
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={t.team.timeWasting} onChange={(e) => apply((x) => { x.team.timeWasting = e.target.checked; })} /> Waste time</label>
      </CardBody>
    </Card>
  );
}

function LiveSubs({ sim, side, onChange, toast }: { sim: MatchSimulation; side: 0 | 1; onChange: () => void; toast: (t: string, tone?: "info" | "success" | "error" | "warn") => void }) {
  const world = useWorld();
  const view = sim.teamView(side);
  const [off, setOff] = useState("");
  const [on, setOn] = useState("");
  const name = (id: string) => { const p = world.players[id]; return p ? `${p.firstName.charAt(0)}. ${p.lastName}` : id; };
  const make = () => {
    const r = sim.substitute(side, off, on);
    toast(r.message, r.ok ? "success" : "error");
    setOff("");
    setOn("");
    onChange();
  };
  return (
    <Card>
      <CardBody className="space-y-3 text-sm">
        <p className="text-xs text-muted">Tap the player coming <b>off</b>, then the player coming <b>on</b>. Tired players (low %) and poor ratings are highlighted.</p>
        <div className="space-y-1" data-testid="subs-on-pitch">
          {view.onPitch.map((p) => (
            <button key={p.id} type="button" onClick={() => setOff(off === p.id ? "" : p.id)} data-testid="sub-off-option"
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left ${off === p.id ? "border-danger bg-danger/10" : "border-line bg-surface2/40"}`}>
              <span><span className="mr-1 inline-block w-8 text-xs text-muted">{p.position}</span>{name(p.id)}{p.yellow ? <span className="ml-1 inline-block h-3 w-2 bg-gold align-middle" /> : null}</span>
              <span className="flex items-center gap-2 text-xs"><span className={p.energy < 55 ? "font-semibold text-danger" : "text-muted"}>{p.energy}%</span><RatingChip value={p.rating.toFixed(1)} /></span>
            </button>
          ))}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Bench</div>
        <div className="space-y-1" data-testid="subs-bench">
          {view.bench.length === 0 ? <div className="text-muted">No substitutes left.</div> : view.bench.map((p) => (
            <button key={p.id} type="button" onClick={() => setOn(on === p.id ? "" : p.id)} data-testid="sub-on-option"
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left ${on === p.id ? "border-accent bg-accent/10" : "border-line bg-surface2/40"}`}>
              <span><span className="mr-1 inline-block w-8 text-xs text-muted">{p.position}</span>{name(p.id)}</span>
              <RatingChip value={overall(p)} />
            </button>
          ))}
        </div>
        <Button className="sticky bottom-2 w-full" variant="primary" disabled={!off || !on || view.subsLeft <= 0} onClick={make} data-testid="make-sub">
          <Repeat2 size={14} /> {off && on ? `${name(off)} ⟶ ${name(on)}` : `Make substitution (${view.subsLeft} left)`}
        </Button>
      </CardBody>
    </Card>
  );
}

function LiveStats({ sim }: { sim: MatchSimulation }) {
  const r = sim.result();
  return <StatsCard stats={r.stats} />;
}

function EventLine({ e }: { e: MatchEvent }) {
  const strong = ["goal", "red", "second_yellow", "penalty", "half_time", "full_time"].includes(e.type);
  return (
    <div className={cn("flex gap-2 border-b border-line/40 py-1", strong && "font-semibold", e.type === "goal" && "text-accent")}>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{e.minute}&apos;</span>
      <span className="flex-1">{e.type === "yellow" ? "🟨 " : e.type === "red" || e.type === "second_yellow" ? "🟥 " : e.type === "goal" ? "⚽ " : e.type === "substitution" ? "🔁 " : e.type === "injury" ? "✚ " : ""}{e.text}</span>
    </div>
  );
}

function StatsCard({ stats }: { stats: [TeamMatchStats, TeamMatchStats] }) {
  const rows: [string, number, number, boolean?][] = [
    ["Possession %", stats[0].possession, stats[1].possession], ["Shots", stats[0].shots, stats[1].shots], ["On target", stats[0].shotsOnTarget, stats[1].shotsOnTarget],
    ["xG", stats[0].xg, stats[1].xg, true], ["Passes", stats[0].passes, stats[1].passes],
    ["Pass accuracy %", stats[0].passes ? Math.round((stats[0].passesCompleted / stats[0].passes) * 100) : 0, stats[1].passes ? Math.round((stats[1].passesCompleted / stats[1].passes) * 100) : 0],
    ["Tackles", stats[0].tackles, stats[1].tackles], ["Interceptions", stats[0].interceptions, stats[1].interceptions], ["Press wins", stats[0].pressWins, stats[1].pressWins],
    ["Fouls", stats[0].fouls, stats[1].fouls], ["Corners", stats[0].corners, stats[1].corners], ["Offsides", stats[0].offsides, stats[1].offsides], ["Saves", stats[0].saves, stats[1].saves],
    ["Yellow / red", stats[0].yellow * 10 + stats[0].red, stats[1].yellow * 10 + stats[1].red],
  ];
  return (
    <Card>
      <CardHeader title="Match statistics" />
      <CardBody className="space-y-2" data-testid="match-stats">
        {rows.map(([n, a, b, dec]) => {
          const isCards = n === "Yellow / red";
          const fa = isCards ? `${Math.floor(a / 10)} / ${a % 10}` : dec ? a.toFixed(2) : a;
          const fb = isCards ? `${Math.floor(b / 10)} / ${b % 10}` : dec ? b.toFixed(2) : b;
          const total = a + b || 1;
          return (
            <div key={n}>
              <div className="flex justify-between text-xs"><span className="tabular-nums">{fa}</span><span className="text-muted">{n}</span><span className="tabular-nums">{fb}</span></div>
              <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-line"><div className="bg-accent" style={{ width: `${(a / total) * 100}%` }} /><div className="ml-auto bg-info" style={{ width: `${(b / total) * 100}%` }} /></div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function MatchReview({ world, f, m }: { world: World; f: Fixture; m: MatchRecord }) {
  const keyEvents = m.events.filter((e) => ["goal", "yellow", "red", "second_yellow", "substitution", "injury", "penalty_miss", "penalty_saved", "shootout_goal", "shootout_miss"].includes(e.type));
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const names = useMemo(() => Object.fromEntries(m.lines.map((l) => [l.playerId, world.players[l.playerId]?.lastName ?? ""])), [m, world]);
  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setIdx((i) => (i + 1 < m.events.length ? i + 1 : (setPlaying(false), i))), 350);
    return () => clearInterval(h);
  }, [playing, m.events.length]);
  const replayable = m.detailed && !!m.shapes && m.events.length > 20;
  const ev = m.events[idx];
  const onPitch = useMemo(() => {
    const set = new Set(m.lines.filter((l) => l.started).map((l) => l.playerId));
    for (const e of m.events.slice(0, idx + 1)) {
      if (e.type === "substitution") { if (e.otherPlayerId) set.delete(e.otherPlayerId); if (e.playerId) set.add(e.playerId); }
      if ((e.type === "red" || e.type === "second_yellow") && e.playerId) set.delete(e.playerId);
    }
    return set;
  }, [m, idx]);
  const home = world.clubs[f.homeClubId];
  const away = world.clubs[f.awayClubId];
  const scoreAt = useMemo(() => {
    let h = 0, a = 0;
    for (const e of m.events.slice(0, idx + 1)) if (e.type === "goal") e.side === 0 ? h++ : a++;
    return [h, a] as [number, number];
  }, [m, idx]);
  return (
    <div>
      <Header world={world} f={f} score={[m.homeGoals, m.awayGoals]} minute={`Full time${m.extraTime ? " (a.e.t.)" : ""}${m.penalties ? ` · ${m.penalties.home}–${m.penalties.away} on penalties` : ""} · ${m.attendance.toLocaleString()} fans`} />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {replayable ? (
            <Card className="p-2">
              <MatchPitch dots={replayDots(m, { x: ev?.x ?? 50, y: ev?.y ?? 50 }, (ev?.side ?? 0) as 0 | 1, onPitch, names)} ball={{ x: ev?.x ?? 50, y: ev?.y ?? 50 }} homeColor={home.kits[0]?.primary ?? home.colors.primary} awayColor={(away.kits.find((k) => k.slot === "away") ?? away.kits[0])?.primary ?? away.colors.primary} highlight={ev?.playerId} />
              <div className="flex flex-wrap items-center gap-3 p-2">
                <Button size="sm" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />} Replay</Button>
                <input type="range" min={0} max={m.events.length - 1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="flex-1 accent-[#22d38b]" aria-label="Replay position" />
                <Button size="sm" variant="ghost" onClick={() => setIdx(Math.min(m.events.length - 1, idx + 25))}><FastForward size={14} /></Button>
                <span className="w-56 truncate text-xs text-muted">{ev ? `${ev.minute}' ${scoreAt[0]}-${scoreAt[1]} · ${ev.text}` : ""}</span>
              </div>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Key events" />
            <div className="px-4 py-2 text-sm">{keyEvents.length ? keyEvents.map((e, i) => <EventLine key={i} e={e} />) : <div className="py-2 text-muted">No key events.</div>}</div>
          </Card>
          {m.lines.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1].map((side) => <RatingsTable key={side} world={world} lines={m.lines.filter((l) => l.side === side)} title={side === 0 ? home.name : away.name} motm={m.playerOfMatchId} />)}
            </div>
          ) : <Card><CardBody className="text-sm text-muted">Individual player ratings are kept for your own matches only (AI-vs-AI matches store team statistics and key events).</CardBody></Card>}
        </div>
        <StatsCard stats={m.stats} />
      </div>
    </div>
  );
}

function RatingsTable({ world, lines, title, motm }: { world: World; lines: PlayerMatchLine[]; title: string; motm: string | null }) {
  return (
    <Card className="overflow-auto">
      <CardHeader title={title} />
      <table className="tbl">
        <thead><tr><th>Player</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">xG</th><th className="num">Pass</th><th className="num">Rating</th></tr></thead>
        <tbody>
          {lines.map((l) => {
            const p = world.players[l.playerId];
            return (
              <tr key={l.playerId}>
                <td className="whitespace-nowrap"><span className="mr-1 text-xs text-muted">{l.position}</span>{p ? <Link className="hover:text-accent" href={`/game/player/?id=${p.id}`}>{p.lastName}</Link> : "?"}{!l.started ? <span className="ml-1 text-xs text-muted">(sub)</span> : null}{motm === l.playerId ? <Badge tone="gold" className="ml-1">MOTM</Badge> : null}</td>
                <td className="num">{l.minutes}</td><td className="num">{l.goals || ""}</td><td className="num">{l.assists || ""}</td><td className="num">{l.xg ? l.xg.toFixed(2) : ""}</td>
                <td className="num text-xs">{l.passes ? `${l.passesCompleted}/${l.passes}` : ""}</td>
                <td className="num"><RatingChip value={l.rating.toFixed(1)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
