"use client";
import { useMemo, useState } from "react";
import type { ContractOffer, ID, Negotiation, TransferOffer } from "@/engine/core/types";
import { useGame, useWorld } from "@/store/game";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, KV } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { acceptCounterBid, contractDemand, defaultTransferOffer, openNegotiation, submitBid, submitContractOffer } from "@/engine/transfers/market";
import { isTransferWindowOpen } from "@/engine/competition/season";
import { fullName } from "@/engine/world/players";
import { overall } from "@/engine/core/ratings";
import { money, wage } from "@/lib/format";
import { addMonths } from "@/engine/core/dates";
import { knowledgeOf } from "@/engine/club/scouting";

function NumField({ label, value, onChange, step = 100_000, testId, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; testId?: string; suffix?: string }) {
  return (
    <div>
      <label className="label">{label}{suffix ? <span className="ml-1 text-muted/70">{suffix}</span> : null}</label>
      <Input type="number" min={0} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} data-testid={testId} />
    </div>
  );
}

export function NegotiationDialog({ playerId, mode, open, onClose }: { playerId: ID; mode: "buy" | "loan" | "renew"; open: boolean; onClose: () => void }) {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const p = world.players[playerId];
  const club = world.clubs[world.meta.userClubId];
  const seller = p.clubId ? world.clubs[p.clubId] : null;
  const kind: Negotiation["kind"] = mode === "renew" ? "renewal" : seller ? "transfer" : "free_agent";
  const [negId, setNegId] = useState<ID | null>(null);
  const neg = negId ? world.negotiations[negId] : null;
  const k = knowledgeOf(world, p);
  const [offer, setOffer] = useState<TransferOffer>(() => ({
    ...defaultTransferOffer(Math.round((p.value || 100_000) / 100_000) * 100_000),
    type: mode === "loan" ? "loan" : "permanent",
    loanEndDate: world.seasons[world.meta.currentSeasonId].endDate,
    loanWageSharePct: 100,
    optionToBuyFee: Math.round(p.value * 1.3 / 100_000) * 100_000,
  }));
  const demand = useMemo(() => contractDemand(world, p, club, kind === "renewal"), [world, p, club, kind]);
  const [contract, setContract] = useState<ContractOffer>({ ...demand, wage: Math.round(demand.wage * 0.9 / 50) * 50, signingBonus: Math.round(demand.signingBonus * 0.8 / 1000) * 1000 });
  const [log, setLog] = useState<{ tone: "accent" | "danger" | "warn"; text: string }[]>([]);
  const myPlayers = Object.values(world.players).filter((x) => x.clubId === club.id && !x.loanParentClubId).sort((a, b) => overall(b) - overall(a));

  const ensureNeg = (): Negotiation => {
    if (neg && ["open", "contract_stage", "club_agreed"].includes(neg.status)) return neg;
    const n = mutate((w) => openNegotiation(w, p.id, club.id, kind));
    setNegId(n.id);
    return n;
  };
  const stage: "fee" | "contract" | "done" = !neg ? (kind === "transfer" ? "fee" : "contract") : neg.status === "open" ? "fee" : neg.status === "contract_stage" || neg.status === "club_agreed" ? "contract" : "done";
  const isLoan = offer.type !== "permanent";

  const sendBid = () => {
    const n = ensureNeg();
    const res = mutate((w) => submitBid(w, n.id, offer));
    setLog((l) => [...l, { tone: res.decision === "accepted" ? "accent" : res.decision === "countered" ? "warn" : "danger", text: res.message }]);
    if (res.decision === "accepted" && isLoan) {
      const r2 = mutate((w) => submitContractOffer(w, n.id, contract));
      setLog((l) => [...l, { tone: r2.completed ? "accent" : "danger", text: r2.message }]);
      if (r2.completed) toast(r2.message, "success");
    }
  };
  const acceptCounter = () => {
    if (!neg) return;
    const res = mutate((w) => acceptCounterBid(w, neg.id));
    setLog((l) => [...l, { tone: res.decision === "accepted" ? "accent" : "danger", text: res.message }]);
  };
  const sendContract = () => {
    const n = ensureNeg();
    const res = mutate((w) => submitContractOffer(w, n.id, contract));
    setLog((l) => [...l, { tone: res.decision === "accepted" ? "accent" : res.decision === "countered" ? "warn" : "danger", text: res.message }]);
    if (res.completed) toast(res.message, "success");
  };
  const windowOpen = isTransferWindowOpen(world, world.meta.currentDate);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={mode === "renew" ? `Contract renewal: ${fullName(p)}` : `${isLoan ? "Loan" : "Transfer"}: ${fullName(p)}`} description={seller && mode !== "renew" ? `${seller.name} · value ${money(p.value)}${p.contract?.releaseClause ? ` · release clause ${money(p.contract.releaseClause)}` : ""}` : `Ability ${k.exact ? overall(p) : `${k.overall[0]}–${k.overall[1]}`}`} className="w-[min(760px,96vw)]">
      <div className="space-y-4" data-testid="negotiation-dialog">
        {!windowOpen && kind === "transfer" ? <div className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">The transfer window is closed. Fees can be agreed, but the move only completes while a window is open.</div> : null}
        {stage === "fee" ? (
          <section>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">1 · Offer to {seller?.shortName}</h3><Badge tone="info">Budget {money(club.finance.transferBudget)}</Badge></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Deal type</label>
                <Select value={offer.type} onChange={(v) => setOffer({ ...offer, type: v })} options={[{ value: "permanent", label: "Permanent transfer" }, { value: "loan", label: "Loan" }, { value: "loan_with_option", label: "Loan with option to buy" }]} testId="offer-type" />
              </div>
              {!isLoan ? (
                <>
                  <NumField label="Fee" value={offer.fee} onChange={(v) => setOffer({ ...offer, fee: v })} testId="offer-fee" />
                  <NumField label="Paid upfront" suffix="%" value={offer.upfrontPct} step={10} onChange={(v) => setOffer({ ...offer, upfrontPct: Math.min(100, v) })} />
                  <NumField label="Add-on after 25 apps" value={offer.addOnAppearances} onChange={(v) => setOffer({ ...offer, addOnAppearances: v })} />
                  <NumField label="Add-on after 10 goals" value={offer.addOnGoals} onChange={(v) => setOffer({ ...offer, addOnGoals: v })} />
                  <NumField label="Sell-on clause" suffix="%" value={offer.sellOnPct} step={5} onChange={(v) => setOffer({ ...offer, sellOnPct: Math.min(50, v) })} />
                  <div className="sm:col-span-3">
                    <label className="label">Player exchange (offer your players as part of the deal)</label>
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto">
                      {myPlayers.map((x) => {
                        const on = offer.exchangePlayerIds.includes(x.id);
                        return <button key={x.id} type="button" onClick={() => setOffer({ ...offer, exchangePlayerIds: on ? offer.exchangePlayerIds.filter((i) => i !== x.id) : [...offer.exchangePlayerIds, x.id] })} className={`chip ${on ? "border-accent text-accent" : ""}`}>{x.lastName} · {money(x.value)}</button>;
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <NumField label="Loan fee" value={offer.loanFee} onChange={(v) => setOffer({ ...offer, loanFee: v })} />
                  <NumField label="Wages you pay" suffix="%" value={offer.loanWageSharePct} step={5} onChange={(v) => setOffer({ ...offer, loanWageSharePct: Math.min(100, v) })} />
                  <div>
                    <label className="label">Loan until</label>
                    <Select value={offer.loanEndDate ?? ""} onChange={(v) => setOffer({ ...offer, loanEndDate: v })} options={[world.seasons[world.meta.currentSeasonId].endDate, addMonths(world.meta.currentDate, 6)].map((d) => ({ value: d, label: d }))} />
                  </div>
                  {offer.type === "loan_with_option" ? <NumField label="Option to buy fee" value={offer.optionToBuyFee} onChange={(v) => setOffer({ ...offer, optionToBuyFee: v })} /> : null}
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={sendBid} data-testid="submit-bid">Submit offer</Button>
              {neg?.counterTransfer ? <Button variant="outline" onClick={acceptCounter} data-testid="accept-counter">Accept their terms ({money(neg.counterTransfer.fee)})</Button> : null}
            </div>
          </section>
        ) : null}
        {stage === "contract" && !isLoan ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{kind === "transfer" ? "2 · " : ""}Personal terms</h3>
              <span className="text-xs text-muted">Agent's demand: {wage(demand.wage)} · {demand.years} yrs · {demand.squadRole.replace("_", " ")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumField label="Weekly wage" value={contract.wage} step={500} onChange={(v) => setContract({ ...contract, wage: v })} testId="contract-wage" />
              <div>
                <label className="label">Length (years)</label>
                <Select value={String(contract.years)} onChange={(v) => setContract({ ...contract, years: Number(v) })} options={[1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `${y} year${y > 1 ? "s" : ""}` }))} />
              </div>
              <div>
                <label className="label">Squad role (playing time)</label>
                <Select value={contract.squadRole} onChange={(v) => setContract({ ...contract, squadRole: v })} options={["key", "first_team", "rotation", "backup", "prospect"].map((r) => ({ value: r as ContractOffer["squadRole"], label: r.replace("_", " ") }))} />
              </div>
              <NumField label="Signing bonus" value={contract.signingBonus} step={10_000} onChange={(v) => setContract({ ...contract, signingBonus: v })} />
              <NumField label="Appearance bonus" value={contract.appearanceBonus} step={500} onChange={(v) => setContract({ ...contract, appearanceBonus: v })} />
              <NumField label="Goal bonus" value={contract.goalBonus} step={500} onChange={(v) => setContract({ ...contract, goalBonus: v })} />
              <div>
                <label className="label">Release clause</label>
                <Input type="number" min={0} step={1_000_000} placeholder="None" value={contract.releaseClause ?? ""} onChange={(e) => setContract({ ...contract, releaseClause: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={sendContract} data-testid="submit-contract">Offer contract</Button>
              {neg?.counterContract ? <Button variant="outline" onClick={() => setContract(neg.counterContract!)}>Use agent's counter ({wage(neg.counterContract.wage)})</Button> : null}
            </div>
            <div className="mt-2"><KV k="Current wage bill vs budget" v={`${money(club.finance.wageBudget)}/wk budget`} /></div>
          </section>
        ) : null}
        {stage === "done" ? <div className="rounded-lg border border-line bg-surface2 px-3 py-2 text-sm">Talks are closed ({neg?.status.replace("_", " ")}).</div> : null}
        {log.length ? (
          <div className="space-y-1 rounded-lg border border-line bg-bg/40 p-3 text-sm" data-testid="negotiation-log">
            {log.map((l, i) => <div key={i} className={l.tone === "accent" ? "text-accent" : l.tone === "warn" ? "text-warn" : "text-danger"}>• {l.text}</div>)}
          </div>
        ) : null}
        {neg ? <div className="text-xs text-muted">Patience: {neg.patience} round(s) left before talks collapse.</div> : null}
      </div>
    </Dialog>
  );
}
