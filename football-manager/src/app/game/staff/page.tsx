"use client";
import { useState } from "react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Empty, Input, KV, RatingChip } from "@/components/ui/misc";
import { ClubName, PageTitle } from "@/components/game/common";
import { STAFF_ROLES, type Staff, type StaffRole } from "@/engine/core/types";
import { ROLE_LABEL, STAFF_LIMITS, dismissStaff, hireStaff, keyRating, staffWageDemand } from "@/engine/club/staff";
import { ageOn } from "@/engine/core/dates";
import { date, label, wage } from "@/lib/format";

export default function StaffPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const uc = world.meta.userClubId;
  const club = world.clubs[uc];
  const [role, setRole] = useState<StaffRole | "all">("all");
  const [onlyFree, setOnlyFree] = useState(true);
  const [hire, setHire] = useState<Staff | null>(null);
  const mine = Object.values(world.staff).filter((s) => s.clubId === uc).sort((a, b) => STAFF_ROLES.indexOf(a.role) - STAFF_ROLES.indexOf(b.role));
  const market = Object.values(world.staff).filter((s) => s.clubId !== uc && !s.isUser && s.role !== "manager" && (role === "all" || s.role === role) && (!onlyFree || !s.clubId)).sort((a, b) => keyRating(b) - keyRating(a)).slice(0, 80);
  const counts = (r: StaffRole) => mine.filter((s) => s.role === r).length;
  return (
    <div className="space-y-4">
      <PageTitle title="Staff" sub="Coaches improve training and development; scouts reveal players; medical staff shorten injuries." />
      <Card className="overflow-auto">
        <CardHeader title="Your staff" />
        <table className="tbl min-w-[900px]" data-testid="staff-table">
          <thead><tr><th>Role</th><th>Name</th><th className="num">Age</th><th className="num">Rating</th><th>Coaching / Tactical / Youth / Medical</th><th>Specialisation</th><th className="num">Wage</th><th>Contract</th><th /></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}>
                <td className="text-xs">{ROLE_LABEL[s.role]}{s.isUser ? <Badge tone="accent" className="ml-1">You</Badge> : null}</td>
                <td>{s.firstName} {s.lastName}</td>
                <td className="num">{ageOn(s.dob, world.meta.currentDate)}</td>
                <td className="num"><RatingChip value={keyRating(s) * 5} /></td>
                <td className="text-xs text-muted">{s.attributes.coaching} / {s.attributes.tactical} / {s.attributes.youth} / {s.attributes.medical}</td>
                <td className="text-xs">{s.specialisation}</td>
                <td className="num">{s.contract ? wage(s.contract.wage) : "—"}</td>
                <td className="text-xs">{s.contract ? date(s.contract.endDate) : "—"}</td>
                <td className="text-right">{!s.isUser ? <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Dismiss ${s.firstName} ${s.lastName}? The remaining contract (up to one year) will be paid.`)) { const r = mutate((w) => dismissStaff(w, uc, s.id)); toast(r.message, r.ok ? "success" : "error"); } }}>Dismiss</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2 p-3 text-xs text-muted">{STAFF_ROLES.filter((r) => r !== "manager").map((r) => <span key={r} className="chip">{ROLE_LABEL[r]} {counts(r)}/{STAFF_LIMITS[r]}</span>)}</div>
      </Card>
      <Card className="overflow-auto">
        <CardHeader title="Recruit staff" action={<><Select label="Role" value={role} onChange={(v) => setRole(v as StaffRole | "all")} options={[{ value: "all", label: "All roles" }, ...STAFF_ROLES.filter((r) => r !== "manager").map((r) => ({ value: r, label: ROLE_LABEL[r] }))]} className="w-52" testId="staff-role-filter" /><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> Unattached only</label></>} />
        {market.length === 0 ? <Empty title="Nobody available" /> : (
          <table className="tbl min-w-[800px]">
            <thead><tr><th>Role</th><th>Name</th><th>Club</th><th className="num">Rating</th><th className="num">Rep.</th><th className="num">Exp.</th><th className="num">Asks</th><th /></tr></thead>
            <tbody>
              {market.map((s) => (
                <tr key={s.id}>
                  <td className="text-xs">{ROLE_LABEL[s.role]}</td>
                  <td>{s.firstName} {s.lastName}</td>
                  <td><ClubName world={world} id={s.clubId} short /></td>
                  <td className="num"><RatingChip value={keyRating(s) * 5} /></td>
                  <td className="num">{s.reputation}</td>
                  <td className="num">{s.experience}</td>
                  <td className="num">{wage(staffWageDemand(s, club.reputation) * (s.clubId ? 1.25 : 1))}</td>
                  <td className="text-right"><Button size="sm" variant="outline" onClick={() => setHire(s)} data-testid="hire-staff">Approach</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {hire ? <HireDialog s={hire} onClose={() => setHire(null)} /> : null}
    </div>
  );
}

function HireDialog({ s, onClose }: { s: Staff; onClose: () => void }) {
  const world = useWorld();
  const mutate = useGame((st) => st.mutate);
  const toast = useGame((st) => st.toast);
  const club = world.clubs[world.meta.userClubId];
  const demand = Math.round(staffWageDemand(s, club.reputation) * (s.clubId ? 1.25 : 1));
  const [w, setW] = useState(demand);
  const [years, setYears] = useState(2);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Hire ${s.firstName} ${s.lastName}`} description={`${ROLE_LABEL[s.role]} · ${s.specialisation}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" data-testid="confirm-hire" onClick={() => { const r = mutate((wd) => hireStaff(wd, club.id, s.id, w, years)); toast(r.message, r.ok ? "success" : "error"); if (r.ok) onClose(); }}>Offer contract</Button></>}>
      <div className="grid grid-cols-2 gap-x-6">
        {Object.entries(s.attributes).map(([k, v]) => <KV key={k} k={label(k.replace(/([A-Z])/g, " $1"))} v={v} />)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><label className="label">Weekly wage (asks {wage(demand)})</label><Input type="number" step={100} value={w} onChange={(e) => setW(Number(e.target.value))} /></div>
        <div><label className="label">Years</label><Select value={String(years)} onChange={(v) => setYears(Number(v))} options={["1", "2", "3", "4"].map((y) => ({ value: y, label: `${y}` }))} /></div>
      </div>
      {s.clubId ? <p className="mt-2 text-xs text-muted">This person is employed by {world.clubs[s.clubId].name}; a compensation fee of six months' wages is payable.</p> : null}
    </Dialog>
  );
}
