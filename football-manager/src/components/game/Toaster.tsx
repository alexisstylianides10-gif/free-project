"use client";
import { useGame } from "@/store/game";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

export function Toaster() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,92vw)] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-2xl animate-fadein", t.tone === "success" && "border-accent/40", t.tone === "error" && "border-danger/50", t.tone === "warn" && "border-warn/40", t.tone === "info" && "border-line")}>
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", t.tone === "success" && "bg-accent", t.tone === "error" && "bg-danger", t.tone === "warn" && "bg-warn", t.tone === "info" && "bg-info")} />
          <span className="flex-1">{t.text}</span>
          <button className="text-muted hover:text-fg" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
