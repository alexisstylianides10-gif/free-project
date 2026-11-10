"use client";
import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RatingChip } from "@/components/ui/misc";
import { PosBadge } from "./common";
import { openConversations, respondConversation } from "@/engine/world/career";
import { overall } from "@/engine/core/ratings";
import { fullName } from "@/engine/world/players";

const TOPIC: Record<string, string> = { playing_time: "Playing time", contract: "Contract", wants_move: "Transfer interest" };

/** Players asking to speak to the manager, with answer choices (career-mode style). */
export function Conversations() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const [result, setResult] = useState<{ id: string; text: string } | null>(null);
  const list = openConversations(world);
  if (!list.length && !result) return null;
  return (
    <Card data-testid="conversations">
      <CardHeader title="Players want to talk" />
      <CardBody className="space-y-3">
        {result ? <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm" data-testid="conversation-result">{result.text}</div> : null}
        {list.map((c) => {
          const p = world.players[c.playerId];
          return (
            <div key={c.id} className="rounded-xl border border-line bg-surface2/40 p-3" data-testid="conversation">
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle size={16} className="text-accent" />
                <RatingChip value={overall(p)} />
                <PosBadge pos={p.position} />
                <Link href={`/game/player/?id=${p.id}`} className="truncate font-semibold hover:underline">{fullName(p)}</Link>
                <span className="ml-auto shrink-0 text-xs text-muted">{TOPIC[c.topic]}</span>
              </div>
              <p className="mb-3 text-sm italic text-fg/90">{c.message}</p>
              <div className="grid gap-2">
                {c.options.map((o) => (
                  <Button key={o.id} variant="secondary" className="h-auto justify-start whitespace-normal py-2 text-left" data-testid={`conversation-option-${o.id}`}
                    onClick={() => mutate((w) => { const text = respondConversation(w, c.id, o.id); setResult({ id: c.id, text: `${fullName(p)}: ${text}` }); })}>
                    <span>
                      <span className="block text-sm">{o.text}</span>
                      <span className="block text-[11px] text-muted">{o.hint}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
