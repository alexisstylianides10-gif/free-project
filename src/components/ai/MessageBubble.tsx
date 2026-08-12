"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { ChatMessage } from "@/lib/types";
import { ConfirmationCard } from "./ConfirmationCard";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  onDecide,
}: {
  message: ChatMessage;
  onDecide: (messageId: string, pendingActionId: string, decision: "confirm" | "cancel") => Promise<void>;
}) {
  const isUser = message.role === "user";
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isUser ? "bg-muted" : "bg-accent-soft")}>
        {isUser ? <User className="h-3.5 w-3.5 text-muted-foreground" /> : <Bot className="h-3.5 w-3.5 text-accent" />}
      </div>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", isUser && "flex flex-col items-end")}>
        <div className={cn("rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed", isUser ? "bg-accent text-accent-foreground" : "bg-surface border border-border text-foreground")}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.pendingAction && (
          <ConfirmationCard
            action={message.pendingAction}
            resolvedSummary={message.resolvedAction?.resultSummary}
            onDecide={(decision) => onDecide(message.id, message.pendingAction!.id, decision)}
          />
        )}
        <span className="mt-1 text-[11px] text-muted-foreground/70">{time}</span>
      </div>
    </motion.div>
  );
}
