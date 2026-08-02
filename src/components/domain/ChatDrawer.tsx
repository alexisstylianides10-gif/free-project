"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Message, TripMember } from "@/lib/types";
import { formatDayLabel } from "@/lib/utils";

export function ChatDrawer({
  open,
  onOpenChange,
  messages,
  members,
  currentMemberId,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  members: TripMember[];
  currentMemberId?: string;
  onSend: (content: string) => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages.length]);

  function submit() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Trip Chat"
      icon={<MessageCircle className="h-4 w-4 text-accent" />}
      footer={
        <div className="flex items-center gap-2 px-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Message the group..."
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button onClick={submit} disabled={!input.trim()} className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {messages.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">Say hi to your group.</p>}
        {messages.map((m) => {
          const isAI = m.senderId === "ai";
          const isMe = m.senderId === currentMemberId;
          const sender = members.find((mem) => mem.id === m.senderId);
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              {isAI ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
              ) : (
                <Avatar initials={sender?.avatarInitials ?? "?"} size="sm" />
              )}
              <div className={`flex max-w-[80%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && !isAI && <span className="mb-0.5 text-[11.5px] font-medium text-muted-foreground">{sender?.name}</span>}
                <div
                  className={`whitespace-pre-line rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                    isMe ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-foreground"
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-0.5 text-[10.5px] text-muted-foreground/70">{formatDayLabel(m.createdAt.slice(0, 10))}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}
