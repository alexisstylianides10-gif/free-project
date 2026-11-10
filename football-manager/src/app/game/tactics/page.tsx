"use client";
import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Save, Trash2, Wand2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input, Progress, RatingChip } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTitle, PosBadge } from "@/components/game/common";
import { TacticsPitch } from "@/components/game/TacticsPitch";
import { LineupSwapper } from "@/components/game/LineupSwapper";
import type { Duty, Level, Player, PlayerInstructions, Position, TacticalSystem, World } from "@/engine/core/types";
import { POSITIONS } from "@/engine/core/types";
import { ROLES, ROLE_MAP, rolesForPosition } from "@/engine/tactics/roles";
import { FORMATION_PRESETS, buildSlots, cloneTactic, createTactic, formationLabel, positionFromCoords, deriveInPossession } from "@/engine/tactics/formations";
import { autoSelect, activeTactic, validateSelection, squadOf } from "@/engine/tactics/selection";
import { newId } from "@/engine/core/ids";
import { overall, ratingInPosition } from "@/engine/core/ratings";
import { nextUserFixture } from "@/engine/world/matchday";
import { label } from "@/lib/format";

const L5 = (names: string[]) => names;

export default function TacticsPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const bump = useGame((s) => s.bump);
  const toast = useGame((s) => s.toast);
  const club = world.clubs[world.meta.userClubId];
  const next = nextUserFixture(world);
  const comp = next ? world.competitions[next.competitionId] : club.leagueId ? world.competitions[club.leagueId] : null;

  useEffect(() => {
    if (!club.selection) mutate((w) => { const c = w.clubs[w.meta.userClubId]; c.selection = autoSelect(w, c, activeTactic(c), comp, w.meta.currentDate); });
  }, [club, comp, mutate]);

  const [editId, setEditId] = useState<string>(club.selection?.tacticId ?? club.tactics[0].id);
  const tactic = club.tactics.find((t) => t.id === editId) ?? club.tactics[0];
  const [shape, setShape] = useState<"op" | "ip">("op");
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [allRoles, setAllRoles] = useState(false);
  const sel = club.selection;
  const isActive = sel?.tacticId === tactic.id;
  const squad = useMemo(() => squadOf(world, club.id).sort((a, b) => overall(b) - overall(a)), [world, club.id, world.meta.currentDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const playersBySlot: Record<string, Player | undefined> = {};
  if (sel && isActive) for (const s of tactic.slots) playersBySlot[s.id] = sel.starters[s.id] ? world.players[sel.starters[s.id]] : undefined;
  const issues = sel ? validateSelection(world, club, sel, comp, next?.date ?? world.meta.currentDate) : [];
  const slot = tactic.slots.find((s) => s.id === selSlot) ?? null;

  const edit = (fn: (t: TacticalSystem, w: World) => void) => mutate((w) => { fn(tactic, w); tactic.formationLabel = formationLabel(tactic.slots); });
  const setTeam = <K extends keyof TacticalSystem["team"]>(k: K, v: TacticalSystem["team"][K]) => edit((t) => { t.team[k] = v; });
  const setSP = <K extends keyof TacticalSystem["setPieces"]>(k: K, v: TacticalSystem["setPieces"][K]) => edit((t) => { t.setPieces[k] = v; });

  const onMove = (slotId: string, x: number, y: number, done: boolean) => {
    const s = tactic.slots.find((q) => q.id === slotId);
    if (!s) return;
    if (s.position === "GK" && shape === "op") x = Math.min(x, 12);
    if (shape === "op") {
      s.outOfPossession = { x, y };
      if (done && s.position !== "GK") {
        const np = positionFromCoords(x, y);
        if (np !== "GK" && np !== s.position) {
          s.position = np;
          if (!ROLE_MAP[s.role]?.positions.includes(np)) s.role = rolesForPosition(np)[0]?.id ?? s.role;
        }
      }
    } else s.inPossession = { x, y };
    if (done) edit(() => undefined);
    else bump();
  };

  const newTactic = (preset: string) => mutate((w) => {
    if (club.tactics.length >= 6) { toast("You can keep up to 6 tactical systems.", "warn"); return; }
    const t = createTactic(newId(w, "tac"), club.id, `${preset} system`, preset, w.meta.currentDate);
    t.familiarity = 35;
    club.tactics.push(t);
    setEditId(t.id);
  });
  const assignPlayer = (slotId: string, pid: string) => mutate(() => {
    if (!sel) return;
    for (const [k, v] of Object.entries(sel.starters)) if (v === pid) delete sel.starters[k];
    sel.bench = sel.bench.filter((b) => b !== pid);
    if (pid) sel.starters[slotId] = pid;
    else delete sel.starters[slotId];
  });
  const toggleBench = (pid: string) => mutate(() => {
    if (!sel) return;
    if (sel.bench.includes(pid)) sel.bench = sel.bench.filter((b) => b !== pid);
    else if (sel.bench.length < (comp?.matchday.benchSize ?? 9)) sel.bench.push(pid);
    else toast(`Bench limit is ${comp?.matchday.benchSize ?? 9}.`, "warn");
  });
  const instr = (k: keyof PlayerInstructions, v: PlayerInstructions[keyof PlayerInstructions]) => edit(() => { if (slot) (slot.instructions as unknown as Record<string, unknown>)[k] = v; });

  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warning");
  const starters = new Set(Object.values(sel?.starters ?? {}));

  return (
    <div>
      <PageTitle
        title="Tactics"
        sub={`${tactic.name} · ${tactic.formationLabel} · familiarity ${Math.round(tactic.familiarity)}%`}
        actions={
          <>
            <Select label="Tactical system" value={tactic.id} onChange={setEditId} options={club.tactics.map((t) => ({ value: t.id, label: `${t.name}${sel?.tacticId === t.id ? " (active)" : ""}` }))} className="w-56" testId="tactic-select" />
            {!isActive ? <Button size="sm" variant="primary" onClick={() => mutate((w) => { const c = w.clubs[w.meta.userClubId]; c.selection = autoSelect(w, c, tactic, comp, w.meta.currentDate, { keepExisting: c.selection }); c.selection.tacticId = tactic.id; })} data-testid="activate-tactic">Use for next match</Button> : <Badge tone="accent">Active</Badge>}
            <Select label="New from preset" value="" onChange={(v) => v && newTactic(v)} options={[{ value: "", label: "+ New system…" }, ...Object.keys(FORMATION_PRESETS).map((p) => ({ value: p, label: p }))]} className="w-40" testId="new-tactic" />
            <Button size="sm" onClick={() => mutate((w) => { if (club.tactics.length >= 6) return; const t = cloneTactic(tactic, newId(w, "tac"), `${tactic.name} (copy)`); club.tactics.push(t); setEditId(t.id); })}><Copy size={14} /> Duplicate</Button>
            <Button size="sm" variant="ghost" disabled={club.tactics.length <= 1 || isActive} onClick={() => mutate(() => { club.tactics = club.tactics.filter((t) => t.id !== tactic.id); setEditId(club.tactics[0].id); })} title="Delete system"><Trash2 size={14} /></Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,520px)_1fr]">
        <div className="space-y-3">
          <Card className="p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Tabs value={shape} onValueChange={(v) => setShape(v as "op" | "ip")}>
                <TabsList>
                  <TabsTrigger value="op" data-testid="shape-op">Out of possession</TabsTrigger>
                  <TabsTrigger value="ip" data-testid="shape-ip">In possession</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-muted">Drag players to reshape. Dotted lines show movement between phases.</span>
            </div>
            <TacticsPitch slots={tactic.slots} shape={shape} players={playersBySlot} selected={selSlot} onSelect={setSelSlot} onMove={onMove} ghostShape />
            <div className="mt-2 flex flex-wrap gap-2">
              <Select label="Apply preset shape" value="" onChange={(v) => v && edit((t) => { const old = t.slots; const fresh = buildSlots(v); t.slots = fresh; if (sel && isActive) { const ids = old.map((s) => sel.starters[s.id]); sel.starters = {}; fresh.forEach((s, i) => { if (ids[i]) sel.starters[s.id] = ids[i]; }); } })} options={[{ value: "", label: "Reset to preset…" }, ...Object.keys(FORMATION_PRESETS).map((p) => ({ value: p, label: p }))]} className="w-44" />
              <Button size="sm" onClick={() => edit((t) => t.slots.forEach((s) => (s.inPossession = deriveInPossession(s.position, s.role, s.duty, s.outOfPossession.x, s.outOfPossession.y))))} title="Recalculate the in-possession shape from roles"><Wand2 size={14} /> Auto in-possession shape</Button>
              <Button size="sm" onClick={() => mutate((w) => { const name = prompt("Formation template name", tactic.formationLabel); if (!name) return; w.savedFormations.push({ id: newId(w, "frm"), name, slots: JSON.parse(JSON.stringify(tactic.slots)), createdDate: w.meta.currentDate }); toast("Formation saved.", "success"); })}><Save size={14} /> Save formation</Button>
              {world.savedFormations.length ? <Select label="Load saved formation" value="" onChange={(v) => { const f = world.savedFormations.find((x) => x.id === v); if (f) edit((t) => { const ids = sel && isActive ? t.slots.map((s) => sel.starters[s.id]) : []; t.slots = JSON.parse(JSON.stringify(f.slots)); if (sel && isActive) { sel.starters = {}; t.slots.forEach((s, i) => { if (ids[i]) sel.starters[s.id] = ids[i]; }); } }); }} options={[{ value: "", label: "Load saved formation…" }, ...world.savedFormations.map((f) => ({ value: f.id, label: f.name }))]} className="w-48" /> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Selection check" action={<Button size="sm" onClick={() => mutate((w) => { const c = w.clubs[w.meta.userClubId]; c.selection = autoSelect(w, c, tactic, comp, next?.date ?? w.meta.currentDate, { keepExisting: null }); })} data-testid="auto-pick"><Wand2 size={14} /> Assistant picks team</Button>} />
            <CardBody className="space-y-1.5 text-sm" data-testid="validation">
              {!isActive ? <div className="text-muted">This system is not active. Activate it to edit the line-up.</div> : null}
              {isActive && errors.length === 0 ? <div className="flex items-center gap-2 text-accent"><CheckCircle2 size={14} /> Team is valid{warns.length ? " (with warnings)" : ""}.</div> : null}
              {errors.map((i, n) => <div key={`e${n}`} className="flex items-center gap-2 text-danger"><XCircle size={14} /> {i.message}</div>)}
              {warns.map((i, n) => <div key={`w${n}`} className="flex items-center gap-2 text-warn"><AlertTriangle size={14} /> {i.message}</div>)}
              {sel ? <label className="mt-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={sel.autoFill} onChange={(e) => mutate(() => { sel.autoFill = e.target.checked; })} /> Let the assistant replace unavailable players before matches</label> : null}
            </CardBody>
          </Card>
        </div>
        <Tabs defaultValue="lineup">
          <TabsList>
            <TabsTrigger value="lineup" data-testid="tab-lineup">Line-up</TabsTrigger>
            <TabsTrigger value="player">Position & role</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Team instructions</TabsTrigger>
            <TabsTrigger value="setpieces">Set pieces</TabsTrigger>
            <TabsTrigger value="squad" data-testid="tab-matchday">Matchday squad</TabsTrigger>
          </TabsList>
          <TabsContent value="lineup">
            <Card>
              <CardBody>
                {sel && isActive ? (
                  <LineupSwapper world={world} club={club} tactic={tactic} sel={sel} benchSize={comp?.matchday.benchSize ?? 9} externalSlot={selSlot} onChange={(fn) => mutate(() => fn(sel))} />
                ) : <div className="text-sm text-muted">Activate this system (“Use for next match”) to pick its line-up.</div>}
              </CardBody>
            </Card>
          </TabsContent>
          <TabsContent value="player">
            <Card>
              {!slot ? <CardBody className="text-sm text-muted">Click a player on the pitch to edit their position, role, duty, individual instructions and who plays there.</CardBody> : (
                <CardBody className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label">Position</label>
                      <Select value={slot.position} onChange={(v) => edit(() => { slot.position = v as Position; if (!ROLE_MAP[slot.role]?.positions.includes(v as Position)) slot.role = rolesForPosition(v)[0]?.id ?? slot.role; })} options={POSITIONS.map((p) => ({ value: p, label: p }))} testId="slot-position" />
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <Select value={slot.role} onChange={(v) => edit(() => { slot.role = v; const d = ROLE_MAP[v].duties; if (!d.includes(slot.duty)) slot.duty = d[0]; })} options={(allRoles ? ROLES : rolesForPosition(slot.position).length ? rolesForPosition(slot.position) : ROLES).map((r) => ({ value: r.id, label: r.name }))} testId="slot-role" />
                      <label className="mt-1 flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={allRoles} onChange={(e) => setAllRoles(e.target.checked)} /> show all roles</label>
                    </div>
                    <div>
                      <label className="label">Duty</label>
                      <Select value={slot.duty} onChange={(v) => edit(() => { slot.duty = v as Duty; })} options={(["defend", "support", "attack"] as Duty[]).map((d) => ({ value: d, label: label(d) }))} testId="slot-duty" />
                    </div>
                  </div>
                  <p className="text-xs text-muted">{ROLE_MAP[slot.role]?.description} Key attributes: {ROLE_MAP[slot.role]?.keyAttributes.map((a) => label(a.replace(/([A-Z])/g, " $1"))).join(", ")}.</p>
                  {isActive ? (
                    <div>
                      <label className="label">Player</label>
                      <select className="field" value={sel?.starters[slot.id] ?? ""} onChange={(e) => assignPlayer(slot.id, e.target.value)} data-testid="slot-player">
                        <option value="">— empty —</option>
                        {squad.map((p) => (
                          <option key={p.id} value={p.id} disabled={!!p.injury && p.injury.until > world.meta.currentDate}>
                            {p.position} {p.lastName} · {ratingInPosition(p, slot.position)} at {slot.position}{p.injury && p.injury.until > world.meta.currentDate ? " (injured)" : ""}{starters.has(p.id) && sel?.starters[slot.id] !== p.id ? " ✓XI" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Individual instructions</div>
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {([["passRisk", "Passing risk"], ["dribble", "Dribbling"], ["shoot", "Shooting"], ["cross", "Crossing"], ["press", "Pressing"], ["forwardRuns", "Forward runs"], ["width", "Width (inside ↔ wide)"]] as [keyof PlayerInstructions, string][]).map(([k, n]) => (
                        <div key={k} className="flex items-center justify-between gap-2 text-sm">
                          <span>{n}</span>
                          <div className="inline-flex overflow-hidden rounded-md border border-line">
                            {[-1, 0, 1].map((v) => (
                              <button key={v} type="button" className={`px-2.5 py-1 text-xs ${slot.instructions[k] === v ? "bg-accent text-black" : "text-muted hover:bg-surface2"}`} onClick={() => instr(k, v as -1 | 0 | 1)}>{v === -1 ? (k === "width" ? "In" : "Less") : v === 0 ? "Std" : k === "width" ? "Wide" : "More"}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Switch label="Tackle harder" checked={slot.instructions.tackleHarder} onChange={(v) => instr("tackleHarder", v)} />
                      <Switch label="Mark tighter" checked={slot.instructions.markTighter} onChange={(v) => instr("markTighter", v)} />
                      <Switch label="Hold position" checked={slot.instructions.holdPosition} onChange={(v) => instr("holdPosition", v)} />
                    </div>
                  </div>
                </CardBody>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="team">
            <Card>
              <CardBody className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <TI label="Mentality" value={tactic.team.mentality} onChange={(v) => setTeam("mentality", v)} names={L5(["Very defensive", "Defensive", "Balanced", "Positive", "Attacking"])} testId="ti-mentality" />
                <TI label="Pressing intensity" value={tactic.team.pressing} onChange={(v) => setTeam("pressing", v)} names={L5(["Very low", "Low", "Medium", "High", "Relentless"])} testId="ti-pressing" />
                <TI label="Defensive line" value={tactic.team.defensiveLine} onChange={(v) => setTeam("defensiveLine", v)} names={L5(["Very deep", "Deep", "Standard", "High", "Very high"])} testId="ti-line" />
                <TI label="Width" value={tactic.team.width} onChange={(v) => setTeam("width", v)} names={L5(["Very narrow", "Narrow", "Balanced", "Wide", "Very wide"])} testId="ti-width" />
                <TI label="Tempo" value={tactic.team.tempo} onChange={(v) => setTeam("tempo", v)} names={L5(["Very slow", "Slow", "Normal", "High", "Very high"])} testId="ti-tempo" />
                <TI label="Passing risk" value={tactic.team.passingRisk} onChange={(v) => setTeam("passingRisk", v)} names={L5(["Very safe", "Safe", "Mixed", "Risky", "Very risky"])} testId="ti-risk" />
                <Field label="Build-up style"><Select value={tactic.team.buildUp} onChange={(v) => setTeam("buildUp", v)} options={[{ value: "short", label: "Play out from the back" }, { value: "balanced", label: "Balanced" }, { value: "direct", label: "Direct / long balls" }]} testId="ti-buildup" /></Field>
                <Field label="Focus of play"><Select value={tactic.team.focus} onChange={(v) => setTeam("focus", v)} options={[{ value: "balanced", label: "Balanced" }, { value: "left", label: "Down the left" }, { value: "centre", label: "Through the middle" }, { value: "right", label: "Down the right" }]} /></Field>
                <Field label="Attacking transition (on winning the ball)"><Select value={tactic.team.attackingTransition} onChange={(v) => setTeam("attackingTransition", v)} options={[{ value: "counter", label: "Counter-attack" }, { value: "balanced", label: "Balanced" }, { value: "hold_shape", label: "Hold shape & recycle" }]} testId="ti-counter" /></Field>
                <Field label="Defensive transition (on losing the ball)"><Select value={tactic.team.defensiveTransition} onChange={(v) => setTeam("defensiveTransition", v)} options={[{ value: "counter_press", label: "Counter-press" }, { value: "balanced", label: "Balanced" }, { value: "regroup", label: "Regroup" }]} testId="ti-counterpress" /></Field>
                <Field label="Goalkeeper distribution"><Select value={tactic.team.gkDistribution} onChange={(v) => setTeam("gkDistribution", v)} options={[{ value: "short", label: "Short to defenders" }, { value: "balanced", label: "Balanced" }, { value: "long", label: "Long to forwards" }, { value: "quick", label: "Quick throws to full-backs" }]} /></Field>
                <Field label="Crossing"><Select value={tactic.team.crossStyle} onChange={(v) => setTeam("crossStyle", v)} options={[{ value: "low", label: "Low crosses" }, { value: "mixed", label: "Mixed" }, { value: "high", label: "High crosses" }]} /></Field>
                <Switch label="Offside trap" checked={tactic.team.offsideTrap} onChange={(v) => setTeam("offsideTrap", v)} />
                <Switch label="Waste time" checked={tactic.team.timeWasting} onChange={(v) => setTeam("timeWasting", v)} />
              </CardBody>
            </Card>
          </TabsContent>
          <TabsContent value="setpieces">
            <Card>
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Attacking corners: delivery"><Select value={tactic.setPieces.cornerDelivery} onChange={(v) => setSP("cornerDelivery", v)} options={[{ value: "mixed", label: "Mixed" }, { value: "near", label: "Near post" }, { value: "far", label: "Far post" }, { value: "short", label: "Short" }]} /></Field>
                <Field label="Players forward on corners"><Select value={tactic.setPieces.playersForwardOnCorners} onChange={(v) => setSP("playersForwardOnCorners", v)} options={[{ value: "few", label: "Few (keep cover)" }, { value: "normal", label: "Normal" }, { value: "many", label: "Many (centre-backs up)" }]} /></Field>
                <Field label="Attacking free kicks"><Select value={tactic.setPieces.freeKickApproach} onChange={(v) => setSP("freeKickApproach", v)} options={[{ value: "mixed", label: "Mixed" }, { value: "shoot", label: "Shoot when in range" }, { value: "cross", label: "Cross into the box" }]} /></Field>
                <Field label="Defending corners"><Select value={tactic.setPieces.defendCorners} onChange={(v) => setSP("defendCorners", v)} options={[{ value: "mixed", label: "Mixed" }, { value: "zonal", label: "Zonal marking" }, { value: "man", label: "Man marking" }]} /></Field>
                <Field label="Players left up for the counter"><Select value={String(tactic.setPieces.playersBackForCounter)} onChange={(v) => setSP("playersBackForCounter", Number(v) as 1 | 2 | 3)} options={["1", "2", "3"].map((v) => ({ value: v, label: v }))} /></Field>
                {sel ? (
                  <>
                    <TakerSelect label="Penalty taker" value={sel.penaltyTakerId} players={squad.filter((p) => starters.has(p.id))} attr="penalties" onChange={(v) => mutate(() => { sel.penaltyTakerId = v; })} />
                    <TakerSelect label="Free-kick taker" value={sel.freeKickTakerId} players={squad.filter((p) => starters.has(p.id))} attr="freeKicks" onChange={(v) => mutate(() => { sel.freeKickTakerId = v; })} />
                    <TakerSelect label="Corner taker" value={sel.cornerTakerId} players={squad.filter((p) => starters.has(p.id))} attr="crossing" onChange={(v) => mutate(() => { sel.cornerTakerId = v; })} />
                    <TakerSelect label="Captain" value={sel.captainId} players={squad.filter((p) => starters.has(p.id))} attr="leadership" onChange={(v) => mutate(() => { sel.captainId = v; })} />
                  </>
                ) : null}
              </CardBody>
            </Card>
          </TabsContent>
          <TabsContent value="squad">
            <Card className="overflow-auto">
              <CardHeader title={`Substitutes (${sel?.bench.length ?? 0}/${comp?.matchday.benchSize ?? 9})`} sub={comp ? `${comp.name}: ${comp.matchday.substitutes} substitutions allowed` : undefined} />
              <table className="tbl">
                <thead><tr><th>Pos</th><th>Player</th><th className="num">Ovr</th><th>Cond.</th><th>Status</th><th>Bench</th></tr></thead>
                <tbody>
                  {squad.map((p) => {
                    const inXI = starters.has(p.id);
                    const unavailable = !!p.injury && p.injury.until > world.meta.currentDate;
                    return (
                      <tr key={p.id} className={inXI ? "bg-accent/5" : ""}>
                        <td><PosBadge pos={p.position} /></td>
                        <td>{p.firstName.charAt(0)}. {p.lastName}</td>
                        <td className="num"><RatingChip value={overall(p)} /></td>
                        <td className="w-24"><Progress value={p.fitness} /></td>
                        <td className="text-xs">{inXI ? <Badge tone="accent">XI</Badge> : unavailable ? <Badge tone="danger">Injured</Badge> : p.suspensions.some((s) => s.matches > 0) ? <Badge tone="warn">Suspended</Badge> : null}</td>
                        <td>{!inXI ? <input type="checkbox" aria-label={`Bench ${p.lastName}`} checked={sel?.bench.includes(p.id) ?? false} disabled={unavailable} onChange={() => toggleBench(p.id)} /> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <TacticNameEditor tactic={tactic} onRename={(n) => edit((t) => { t.name = n; })} />
    </div>
  );
}

function TI({ label: l, value, onChange, names, testId }: { label: string; value: Level; onChange: (v: Level) => void; names: string[]; testId?: string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{l}</div>
      <Slider value={value} onChange={(v) => onChange(v as Level)} labels={names} label={l} testId={testId} />
    </div>
  );
}

function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{l}</label>{children}</div>;
}

function TakerSelect({ label: l, value, players, attr, onChange }: { label: string; value: string | null; players: Player[]; attr: "penalties" | "freeKicks" | "crossing" | "leadership"; onChange: (v: string | null) => void }) {
  return (
    <Field label={l}>
      <Select value={value ?? ""} onChange={(v) => onChange(v || null)} options={[{ value: "", label: "Automatic" }, ...players.slice().sort((a, b) => b.attributes[attr] - a.attributes[attr]).map((p) => ({ value: p.id, label: `${p.lastName} (${p.attributes[attr]})` }))]} />
    </Field>
  );
}

function TacticNameEditor({ tactic, onRename }: { tactic: TacticalSystem; onRename: (n: string) => void }) {
  const [name, setName] = useState(tactic.name);
  useEffect(() => setName(tactic.name), [tactic.id, tactic.name]);
  return (
    <div className="mt-4 flex max-w-md items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Tactic name" />
      <Button size="sm" onClick={() => name.trim() && onRename(name.trim())}><Save size={14} /> Rename</Button>
    </div>
  );
}
