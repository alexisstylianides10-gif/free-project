"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Expense, TripMember, TxCategory } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const CATEGORIES: TxCategory[] = ["Hotel", "Flights", "Food", "Activities", "Transport", "Shopping", "Other"];

export function AddExpenseModal({
  open,
  onOpenChange,
  members,
  currency,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TripMember[];
  currency: string;
  onSubmit: (expense: Omit<Expense, "id" | "createdAt" | "tripId">) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [category, setCategory] = useState<TxCategory>("Food");
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.id));

  useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setPaidBy(members[0]?.id ?? "");
      setCategory("Food");
      setParticipantIds(members.map((m) => m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleParticipant(id: string) {
    setParticipantIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function submit() {
    const amt = Number(amount);
    if (!name.trim() || !amt || participantIds.length === 0) return;
    onSubmit({ name: name.trim(), amount: amt, currency, paidBy, participantIds, category, date: todayISO() });
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add expense" description="Split it equally across whoever was there.">
      <div className="space-y-3">
        <input className={inputClass} placeholder="What was it for?" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} type="number" placeholder={`Amount (${currency})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as TxCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Paid by</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaidBy(m.id)}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  paidBy === m.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Split between</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleParticipant(m.id)}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  participantIds.includes(m.id) ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          {participantIds.length > 0 && amount && (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {currency} {(Number(amount) / participantIds.length).toFixed(2)} each
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add expense</Button>
        </div>
      </div>
    </Modal>
  );
}
