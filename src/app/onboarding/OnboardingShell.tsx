"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingShell({
  step,
  totalSteps,
  onBack,
  children,
  footer,
}: {
  step: number; // 0-indexed
  totalSteps: number;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-6">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          aria-label="Back"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            onBack ? "text-foreground hover:bg-muted" : "opacity-0"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-gradient-brand" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-8 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {footer && <div className="mt-6 shrink-0">{footer}</div>}
    </div>
  );
}
