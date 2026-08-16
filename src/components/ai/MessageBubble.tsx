"use client";

import { motion } from "framer-motion";
import { Search, XCircle } from "lucide-react";
import { ChatMessage } from "@/lib/types";
import { ConfirmationCard } from "./ConfirmationCard";
import { ResponseCardRenderer } from "./cards/ResponseCardRenderer";
import { cn } from "@/lib/utils";

const toolLabel: Record<string, string> = {
  calendar_search: "Checked calendar",
  tasks_search: "Checked tasks",
  memory_list: "Checked memory",
};

// Tools whose results render as a dedicated card below — their pill badge
// would just be redundant clutter above the same information.
const CARD_MAPPED_TOOLS = new Set(["calendar_search", "calendar_create", "calendar_update", "tasks_search", "tasks_create", "goals_search", "documents_search", "documents_read", "shopping_search"]);

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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn("flex", isUser && "justify-end")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", isUser && "flex flex-col items-end")}>
        {!isUser && message.toolCalls.some((tc) => !CARD_MAPPED_TOOLS.has(tc.tool)) && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {message.toolCalls
              .filter((tc) => !CARD_MAPPED_TOOLS.has(tc.tool))
              .map((tc, i) => (
                <span
                  key={`${tc.tool}-${i}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    tc.status === "success" ? "bg-muted text-muted-foreground" : "bg-danger-soft text-danger"
                  )}
                >
                  {tc.status === "success" ? <Search className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                  {toolLabel[tc.tool] ?? tc.tool}
                </span>
              ))}
          </div>
        )}
        <div
          className={cn(
            "overflow-hidden text-[14px] leading-relaxed",
            isUser ? "rounded-2xl bg-accent-soft text-foreground" : "text-foreground"
          )}
        >
          {message.imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.imagePreviewUrl} alt="Attached" className={cn("max-h-56 w-full object-cover", !isUser && "rounded-xl")} />
          )}
          <p className={cn("whitespace-pre-wrap", isUser ? "px-3.5 py-2.5" : "py-0.5")}>{message.content}</p>
        </div>
        {!isUser &&
          message.cards?.map((card, i) => <ResponseCardRenderer key={i} card={card} />)}
        {message.pendingAction && (
          <ConfirmationCard
            action={message.pendingAction}
            resolvedSummary={message.resolvedAction?.resultSummary}
            resolvedStatus={message.resolvedAction?.status}
            onDecide={(decision) => onDecide(message.id, message.pendingAction!.id, decision)}
          />
        )}
        <span className="mt-1 text-[11px] text-muted-foreground/70">{time}</span>
      </div>
    </motion.div>
  );
}
