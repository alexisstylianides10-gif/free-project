"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatMessage, PendingAction } from "@/lib/types";
import { AIActionCard } from "./AIActionCard";
import { Avatar } from "@/components/ui/Avatar";
import { useAlxioum } from "@/lib/store";

export function ChatBubble({ message, userInitials }: { message: ChatMessage; userInitials: string }) {
  const applyAction = useAlxioum((s) => s.applyAction);
  const dismissAction = useAlxioum((s) => s.dismissAction);
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {isUser ? (
        <Avatar initials={userInitials} size="sm" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
          <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
        </div>
      )}
      <div className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
            isUser ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-foreground"
          }`}
        >
          {message.content}
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {message.actions.map((action: PendingAction) => (
              <AIActionCard
                key={action.id}
                action={action}
                onApprove={() => applyAction(action, message.id)}
                onDismiss={() => dismissAction(action.id, message.id)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
