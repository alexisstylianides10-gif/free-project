"use client";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { KV, Progress, RatingChip } from "@/components/ui/misc";
import { PageTitle, PlayerLink, PosBadge } from "@/components/game/common";
import type { TrainingFocus, TrainingSchedule } from "@/engine/core/types";
import { overall } from "@/engine/core/ratings";
import { ageOn } from "@/engine/core/dates";
import { clubStaff, coachingQuality } from "@/engine/development/progression";
import { label } from "@/lib/format";

const FOCI: TrainingSchedule["focus"][] = ["balanced", "attacking", "defending", "tactical", "physical", "set_pieces", "recovery", "match_prep"];
const FOCUS_HELP: Record<TrainingSchedule["focus"], string> = {
  balanced: "General development across all areas.",
  attacking: "Finishing, movement and passing in the final third develop faster.",
  defending: "Tackling, marking and positioning develop faster.",
  tactical: "Rapidly improves familiarity with your tactical system (team cohesion in matches).",
  physical: "Pace, stamina and strength develop faster; more fatigue.",
  set_pieces: "Set-piece delivery, free kicks, penalties and heading.",
  recovery: "Players regain condition and shed fatigue quickly; little development.",
  match_prep: "Sharpness and tactical familiarity before key fixtures.",
};

export default function TrainingPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const club = world.clubs[world.meta.userClubId];
  const staff = clubStaff(world, club.id);
  const squad = Object.values(world.players).filter((p) => p.clubId === club.id).sort((a, b) => ageOn(a.dob, world.meta.currentDate) - ageOn(b.dob, world.meta.currentDate));
  const set = <K extends keyof TrainingSchedule>(k: K, v: TrainingSchedule[K]) => mutate(() => { club.training[k] = v; });
  return (
    <div className="space-y-4">
      <PageTitle title="Training" sub="Training focus, intensity, coaching and facilities drive weekly player development." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Team schedule" />
          <CardBody className="space-y-4">
            <div><label className="label">Weekly focus</label><Select value={club.training.focus} onChange={(v) => set("focus", v)} options={FOCI.map((f) => ({ value: f, label: label(f) }))} testId="team-focus" /><p className="mt-1 text-xs text-muted">{FOCUS_HELP[club.training.focus]}</p></div>
            <div><div className="mb-2 text-sm">First-team intensity</div><Slider value={club.training.intensity} onChange={(v) => set("intensity", v as 1 | 2 | 3 | 4 | 5)} labels={["Very light", "Light", "Normal", "Hard", "Very hard"]} label="Training intensity" testId="intensity" /><p className="mt-1 text-xs text-muted">Higher intensity = faster development, slower recovery and more training injuries.</p></div>
            <div><div className="mb-2 text-sm">Youth intensity</div><Slider value={club.training.youthIntensity} onChange={(v) => set("youthIntensity", v as 1 | 2 | 3 | 4 | 5)} labels={["Very light", "Light", "Normal", "Hard", "Very hard"]} label="Youth intensity" /></div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Facilities & coaching" />
          <CardBody>
            <KV k="Training facilities" v={`${club.facilities.training}/20`} />
            <KV k="Youth facilities" v={`${club.facilities.youth}/20`} />
            <KV k="Youth recruitment" v={`${club.facilities.youthRecruitment}/20`} />
            <KV k="Medical facilities" v={`${club.facilities.medical}/20`} />
            <KV k="Coaching staff" v={staff.filter((s) => s.role.includes("coach") || s.role === "assistant").length} />
            <KV k="Next youth intake" v={club.youthIntakeDate.split("-").reverse().join("/")} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent development" />
          <CardBody className="space-y-1 text-sm">
            {world.development.filter((d) => world.players[d.playerId]?.clubId === club.id).slice(-10).reverse().map((d, i) => (
              <div key={i} className="flex justify-between"><PlayerLink p={world.players[d.playerId]} /><span className="text-muted">{d.date} → <RatingChip value={d.overall} /></span></div>
            ))}
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-auto">
        <CardHeader title="Individual training" />
        <table className="tbl min-w-[800px]">
          <thead><tr><th>Pos</th><th>Player</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Coaching</th><th>Fatigue</th><th>Focus</th><th>Learning position</th></tr></thead>
          <tbody>
            {squad.map((p) => (
              <tr key={p.id}>
                <td><PosBadge pos={p.position} /></td>
                <td><PlayerLink p={p} /></td>
                <td className="num">{ageOn(p.dob, world.meta.currentDate)}</td>
                <td className="num"><RatingChip value={overall(p)} /></td>
                <td className="num">{coachingQuality(staff, p).toFixed(1)}</td>
                <td className="w-24"><Progress value={p.fatigue} tone={p.fatigue > 50 ? "danger" : "warn"} /></td>
                <td><select className="field h-7 w-36 text-xs" value={p.trainingFocus} onChange={(e) => mutate(() => { p.trainingFocus = e.target.value as TrainingFocus; })} aria-label={`Training focus for ${p.lastName}`}>{["balanced", "technical", "mental", "physical", "goalkeeping", "attacking", "defending", "set_pieces"].map((f) => <option key={f} value={f}>{label(f)}</option>)}</select></td>
                <td className="text-xs text-muted">{p.retrainPosition ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
