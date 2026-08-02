"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AIChatEntry } from "@/lib/types";
import { formatMoney, formatTime12 } from "@/lib/utils";

const EXAMPLES = ["Plan tomorrow.", "Find something fun near our hotel.", "Make tomorrow cheaper.", "Add Disneyland.", "Detect conflicts."];

export function AIPlannerDrawer({
  open,
  onOpenChange,
  entries,
  currency,
  onAsk,
  onAccept,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: AIChatEntry[];
  currency: string;
  onAsk: (query: string) => void;
  onAccept: (entryId: string) => void;
  onReject: (entryId: string) => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, entries.length]);

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    onAsk(value);
    setInput("");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Trip AI"
      icon={<Sparkles className="h-4 w-4 text-accent" />}
      footer={
        <div className="flex items-center gap-2 px-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask Trip AI anything..."
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button size="sm" onClick={() => submit()} disabled={!input.trim()}>
            Ask
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {entries.length === 0 && (
          <div>
            <p className="text-[13px] text-muted-foreground">
              Grounded in your itinerary, budget, and group preferences. Changes are always shown as a preview before anything is applied.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="rounded-full border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[92%] ${entry.role === "user" ? "" : "w-full"}`}>
              <div
                className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  entry.role === "user" ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-foreground"
                }`}
              >
                {entry.content}
              </div>

              {entry.preview && (
                <div className="mt-2 rounded-xl border border-accent/25 bg-accent-soft/30 p-3.5">
                  <p className="text-[12.5px] font-semibold text-foreground">Here&apos;s what I would change:</p>
                  <div className="mt-2 space-y-1.5">
                    {entry.preview.changes.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-surface/70 px-2.5 py-2 text-[12.5px]">
                        <Badge tone={c.kind === "add" ? "success" : c.kind === "remove" ? "danger" : "warning"}>
                          {c.kind === "add" ? "Add" : c.kind === "remove" ? "Remove" : "Edit"}
                        </Badge>
                        <span className="flex-1 truncate text-foreground">
                          {c.item.emoji} {c.item.name} · {formatTime12(c.item.startTime)}
                        </span>
                        {c.item.cost !== undefined && <span className="text-muted-foreground">{formatMoney(c.item.cost, currency)}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" onClick={() => onAccept(entry.id)} className="gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Accept changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onReject(entry.id)} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" disabled>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}
