"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function CreatePollModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (question: string, options: { text: string }[]) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function submit() {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) return;
    onSubmit(question.trim(), cleaned.map((text) => ({ text })));
    setQuestion("");
    setOptions(["", ""]);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create a poll" description="Let the group vote on a decision.">
      <div className="space-y-3">
        <input className={inputClass} placeholder="e.g. Where should we eat Friday?" value={question} onChange={(e) => setQuestion(e.target.value)} autoFocus />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={inputClass}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setOptions((arr) => arr.map((o, idx) => (idx === i ? e.target.value : o)))}
              />
              {options.length > 2 && (
                <button onClick={() => setOptions((arr) => arr.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setOptions((arr) => [...arr, ""])} className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:opacity-80">
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create poll</Button>
        </div>
      </div>
    </Modal>
  );
}
