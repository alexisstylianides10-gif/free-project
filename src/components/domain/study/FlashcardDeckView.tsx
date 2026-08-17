"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FlashcardDeck } from "@/lib/types";

export function FlashcardDeckView({ deck }: { deck: FlashcardDeck }) {
  const [order, setOrder] = useState<number[]>(() => deck.cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck.cards[order[index]];
  if (!card) return null;

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(order.length - 1, i + delta)));
  }

  function shuffle() {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setIndex(0);
    setFlipped(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          Card {index + 1} of {order.length}
        </span>
        <button onClick={shuffle} className="flex items-center gap-1 font-medium text-accent hover:opacity-80">
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </button>
      </div>

      <button onClick={() => setFlipped((f) => !f)} className="block w-full text-left">
        <Card className="min-h-[160px] border-accent/30">
          <CardContent className="flex min-h-[160px] flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{flipped ? "Answer" : "Question"}</p>
            <p className="text-[15px] font-medium text-foreground">{flipped ? card.back : card.front}</p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <RotateCw className="h-3 w-3" /> Tap to flip
            </p>
          </CardContent>
        </Card>
      </button>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => go(-1)} disabled={index === 0} className="flex-1 justify-center">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" onClick={() => go(1)} disabled={index === order.length - 1} className="flex-1 justify-center">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
