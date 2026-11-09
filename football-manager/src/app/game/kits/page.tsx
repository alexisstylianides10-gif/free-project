"use client";
import { useState } from "react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty, Input } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTitle } from "@/components/game/common";
import { KitPreview } from "@/components/game/KitPreview";
import type { ClubKit, KitSlot } from "@/engine/core/types";
import { SPONSOR_SLOTS, acceptSponsorOffer, activeDeals, generateSponsorOffers, negotiateSponsorOffer } from "@/engine/world/commercial";
import { Rng, deriveSeed } from "@/engine/core/rng";
import { date, label, money } from "@/lib/format";

export default function KitsPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const club = world.clubs[world.meta.userClubId];
  const [slot, setSlot] = useState<KitSlot>("home");
  const kit = club.kits.find((k) => k.slot === slot)!;
  const [draft, setDraft] = useState<ClubKit>({ ...kit });
  const [asks, setAsks] = useState<Record<string, number>>({});
  const switchSlot = (s: KitSlot) => { setSlot(s); setDraft({ ...club.kits.find((k) => k.slot === s)! }); };
  const deals = activeDeals(world, club.id);
  const offers = world.sponsorOffers.filter((o) => o.clubId === club.id);
  const shirt = deals.find((d) => d.slot === "shirt");
  const maker = deals.find((d) => d.slot === "kit_manufacturer");
  const col = (k: keyof ClubKit, n: string) => (
    <div><label className="label">{n}</label><input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-line bg-surface2" value={draft[k] as string} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} aria-label={n} /></div>
  );
  return (
    <div className="space-y-4">
      <PageTitle title="Kits & sponsors" sub="Generic kit designs and fictional/imported sponsors only — no unlicensed real-world branding." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Kit designer" action={<Tabs value={slot} onValueChange={(v) => switchSlot(v as KitSlot)}><TabsList>{(["home", "away", "third", "goalkeeper"] as KitSlot[]).map((s) => <TabsTrigger key={s} value={s}>{label(s)}</TabsTrigger>)}</TabsList></Tabs>} />
          <CardBody className="grid gap-6 sm:grid-cols-[240px_1fr]">
            <div className="flex justify-center rounded-xl bg-surface2 p-4"><KitPreview kit={draft} /></div>
            <div className="grid grid-cols-2 gap-3 content-start">
              {col("primary", "Primary")}{col("secondary", "Secondary")}{col("accent", "Collar / trim")}{col("shorts", "Shorts")}{col("socks", "Socks")}
              <div><label className="label">Pattern</label><Select value={draft.pattern} onChange={(v) => setDraft({ ...draft, pattern: v })} options={["solid", "stripes", "pinstripes", "hoops", "halves", "quarters", "sash", "chevron"].map((p) => ({ value: p as ClubKit["pattern"], label: label(p) }))} testId="kit-pattern" /></div>
              <div><label className="label">Collar</label><Select value={draft.collar} onChange={(v) => setDraft({ ...draft, collar: v })} options={[{ value: "crew", label: "Crew" }, { value: "v", label: "V-neck" }, { value: "polo", label: "Polo" }]} /></div>
              <div><label className="label">Sleeves</label><Select value={draft.sleeves} onChange={(v) => setDraft({ ...draft, sleeves: v })} options={[{ value: "matching", label: "Matching" }, { value: "contrast", label: "Contrast" }]} /></div>
              <div className="col-span-2 text-xs text-muted">Shirt sponsor: {shirt ? world.sponsors[shirt.sponsorId]?.name : "none"} · Manufacturer: {maker ? world.sponsors[maker.sponsorId]?.name : "none"} (set by sponsorship deals)</div>
              <div className="col-span-2 flex gap-2">
                <Button variant="primary" onClick={() => { mutate(() => { const i = club.kits.findIndex((k) => k.slot === slot); club.kits[i] = { ...draft, sponsorText: club.kits[i].sponsorText, manufacturer: club.kits[i].manufacturer }; if (slot === "home") club.colors = { primary: draft.primary, secondary: draft.secondary }; }); toast("Kit design saved.", "success"); }} data-testid="save-kit">Save design</Button>
                <Button variant="ghost" onClick={() => setDraft({ ...kit })}>Revert</Button>
              </div>
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card className="overflow-auto">
            <CardHeader title="Active sponsorship deals" />
            {deals.length === 0 ? <Empty title="No active deals" /> : (
              <table className="tbl"><thead><tr><th>Slot</th><th>Sponsor</th><th className="num">Per season</th><th>Until</th><th className="num">Title bonus</th></tr></thead>
                <tbody>{deals.map((d) => <tr key={d.id}><td className="text-xs">{SPONSOR_SLOTS.find((s) => s.slot === d.slot)?.label}</td><td>{world.sponsors[d.sponsorId]?.name}{world.sponsors[d.sponsorId]?.fictional ? <Badge className="ml-1">Fictional</Badge> : null}</td><td className="num">{money(d.annualValue)}</td><td className="text-xs">{date(d.endDate)}</td><td className="num">{money(d.bonusLeagueTitle)}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
          <Card className="overflow-auto">
            <CardHeader title="Sponsorship offers" action={<Button size="sm" onClick={() => mutate((w) => generateSponsorOffers(w, club.id, new Rng(deriveSeed(w.meta.seed, w.meta.currentDate, "sponsor"))))} data-testid="find-sponsors">Find sponsors</Button>} />
            {offers.length === 0 ? <Empty title="No offers on the table">Offers appear for open slots (including stadium naming rights and commercial partners).</Empty> : (
              <table className="tbl"><thead><tr><th>Slot</th><th>Sponsor</th><th className="num">Per season</th><th>Until</th><th>Negotiate</th><th /></tr></thead>
                <tbody>{offers.map((o) => (
                  <tr key={o.id}>
                    <td className="text-xs">{SPONSOR_SLOTS.find((s) => s.slot === o.slot)?.label}</td>
                    <td>{world.sponsors[o.sponsorId]?.name}</td>
                    <td className="num">{money(o.annualValue)}</td>
                    <td className="text-xs">{o.endDate.slice(0, 4)}</td>
                    <td><div className="flex gap-1"><Input type="number" step={100_000} className="h-8 w-28" value={asks[o.id] ?? Math.round(o.annualValue * 1.15)} onChange={(e) => setAsks({ ...asks, [o.id]: Number(e.target.value) })} aria-label="Requested value" /><Button size="sm" onClick={() => { const r = mutate((w) => negotiateSponsorOffer(w, o.id, asks[o.id] ?? Math.round(o.annualValue * 1.15))); toast(r.message, r.result === "rejected" ? "warn" : "info"); }}>Ask</Button></div></td>
                    <td><Button size="sm" variant="primary" onClick={() => { const r = mutate((w) => acceptSponsorOffer(w, o.id)); toast(r.message, r.ok ? "success" : "error"); }} data-testid="accept-sponsor">Sign</Button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
