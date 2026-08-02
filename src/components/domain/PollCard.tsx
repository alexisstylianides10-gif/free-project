"use client";

import { Check, Plus } from "lucide-react";
import { Poll } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function PollCard({
  poll,
  currentMemberId,
  canClose,
  onVote,
  onClose,
  onAddToItinerary,
}: {
  poll: Poll;
  currentMemberId?: string;
  canClose: boolean;
  onVote: (optionId: string) => void;
  onClose: () => void;
  onAddToItinerary: () => void;
}) {
  const totalVotes = poll.votes.length;
  const myVote = poll.votes.find((v) => v.memberId === currentMemberId)?.optionId;
  const winner = [...poll.options].sort(
    (a, b) => poll.votes.filter((v) => v.optionId === b.id).length - poll.votes.filter((v) => v.optionId === a.id).length
  )[0];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14.5px] font-semibold text-foreground">{poll.question}</p>
        <Badge tone={poll.status === "open" ? "accent" : "neutral"}>{poll.status === "open" ? "Open" : "Closed"}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {poll.options.map((opt) => {
          const votes = poll.votes.filter((v) => v.optionId === opt.id).length;
          const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
          const isMine = myVote === opt.id;
          const isWinner = poll.status === "closed" && winner?.id === opt.id;
          return (
            <button
              key={opt.id}
              disabled={poll.status === "closed"}
              onClick={() => onVote(opt.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors",
                isMine ? "border-accent" : "border-border",
                poll.status === "closed" ? "cursor-default" : "hover:border-border-strong"
              )}
            >
              <div className="absolute inset-y-0 left-0 bg-accent-soft" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-foreground">
                  {opt.emoji} {opt.text}
                  {isMine && <Check className="h-3.5 w-3.5 text-accent" />}
                  {isWinner && <Badge tone="success">Winner</Badge>}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {votes} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {poll.status === "open" && canClose && (
          <Button size="sm" variant="outline" onClick={onClose}>
            Close poll
          </Button>
        )}
        {poll.status === "closed" && !poll.addedToItinerary && (
          <Button size="sm" onClick={onAddToItinerary} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add to itinerary
          </Button>
        )}
        {poll.addedToItinerary && <Badge tone="success">Added to itinerary</Badge>}
      </div>
    </div>
  );
}
