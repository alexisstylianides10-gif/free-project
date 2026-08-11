"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { LifeArea, Priority, TxCategory } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function QuickAddModal() {
  const quickAdd = useAlxioum((s) => s.quickAdd);
  const close = useAlxioum((s) => s.closeQuickAdd);
  const router = useRouter();

  const addTask = useAlxioum((s) => s.addTask);
  const addEvent = useAlxioum((s) => s.addEvent);
  const addDocument = useAlxioum((s) => s.addDocument);
  const addTransaction = useAlxioum((s) => s.addTransaction);
  const addGoal = useAlxioum((s) => s.addGoal);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("17:00");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TxCategory>("Other");
  const [priority, setPriority] = useState<Priority>("medium");
  const [area, setArea] = useState<LifeArea>("personal");

  if (!quickAdd) return null;

  function reset() {
    setTitle("");
    setAmount("");
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset();
      close();
    }
  }

  function submit() {
    if (quickAdd === "task") {
      if (!title.trim()) return;
      addTask({ title, dueDate: date, priority, category: area });
    } else if (quickAdd === "event") {
      if (!title.trim()) return;
      const [h, m] = time.split(":").map(Number);
      const endH = m + 30 >= 60 ? h + 1 : h;
      const endM = (m + 30) % 60;
      addEvent({
        title,
        date,
        startTime: time,
        endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        type: "personal",
        movable: true,
      });
    } else if (quickAdd === "note") {
      if (!title.trim()) return;
      addDocument({ name: title, kind: "text", folder: "Notes", tags: [], sizeKb: 1 });
    } else if (quickAdd === "document") {
      if (!title.trim()) return;
      addDocument({ name: title, kind: "pdf", folder: "Uploads", tags: [], sizeKb: 240 });
    } else if (quickAdd === "expense") {
      if (!amount) return;
      addTransaction({ merchant: title || "Expense", amount: -Math.abs(Number(amount)), date, category });
    } else if (quickAdd === "goal") {
      if (!title.trim()) return;
      addGoal(title);
      router.push("/goals");
    }
    handleClose(false);
  }

  const config: Record<string, { title: string; description: string }> = {
    task: { title: "New task", description: "Add something to get done." },
    event: { title: "New event", description: "Add it to today's schedule." },
    note: { title: "New note", description: "Quick capture — saved to Documents." },
    document: { title: "Upload document", description: "This is a demo environment — files are simulated, not actually stored." },
    expense: { title: "Add expense", description: "Log a transaction to Finance." },
    goal: { title: "Create goal", description: "Set up a new goal with milestones." },
  };

  const { title: modalTitle, description } = config[quickAdd];

  return (
    <Modal open={!!quickAdd} onOpenChange={handleClose} title={modalTitle} description={description}>
      <div className="space-y-3">
        {(quickAdd === "task" || quickAdd === "event" || quickAdd === "note" || quickAdd === "document" || quickAdd === "goal") && (
          <input
            autoFocus
            className={inputClass}
            placeholder={quickAdd === "document" ? "File name" : quickAdd === "goal" ? "Goal name" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}

        {quickAdd === "expense" && (
          <>
            <input className={inputClass} placeholder="Merchant" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Amount (€)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as TxCategory)}>
                {["Food", "Transport", "Shopping", "Entertainment", "Subscriptions", "School", "Other"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {quickAdd === "task" && (
          <div className="flex gap-2">
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {["low", "medium", "high", "critical"].map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)} priority
                </option>
              ))}
            </select>
            <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value as LifeArea)}>
              {["school", "home", "work", "health", "finance", "social", "travel", "personal"].map((a) => (
                <option key={a} value={a}>
                  {a[0].toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {(quickAdd === "task" || quickAdd === "event" || quickAdd === "expense") && (
          <div className="flex gap-2">
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {quickAdd === "event" && <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}
