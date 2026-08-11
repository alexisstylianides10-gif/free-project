"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { ChatBubble } from "@/components/ai/ChatBubble";
import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  "Plan my day.",
  "What do I need to do this week?",
  "Find time for me to study.",
  "How much did I spend this month?",
  "What am I forgetting?",
  "Help me achieve my goals.",
  "What should I prioritize?",
];

export default function AIPage() {
  const chat = useAlxioum((s) => s.chat);
  const sendChatMessage = useAlxioum((s) => s.sendChatMessage);
  const profile = useAlxioum((s) => s.profile);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    sendChatMessage(value);
    setInput("");
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col md:h-[calc(100dvh-6rem)]">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Alxioum AI</h1>
        </div>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Grounded in your tasks, calendar, goals, and habits — it only acts on what you approve.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {chat.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Tell Alxioum what you need</p>
              <p className="mt-1 max-w-xs text-[13.5px] text-muted-foreground">
                It reads your real tasks, calendar, goals, and habits before answering — no guessing.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 px-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chat.map((m) => (
              <ChatBubble key={m.id} message={m} userInitials={profile.avatarInitials} />
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>

      <div className="mt-3">
        {chat.length > 0 && (
          <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {EXAMPLES.slice(0, 4).map((ex) => (
              <button
                key={ex}
                onClick={() => submit(ex)}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-card"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Alxioum what you need..."
            className="h-10 flex-1 bg-transparent px-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
