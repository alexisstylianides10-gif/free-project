"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

const STEP_DURATIONS = [900, 1100, 1600, 2200, 1800]; // ms spent at each step before advancing

export function HeroMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % 5), STEP_DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-pop">
        <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
          <Logo className="h-6 w-6" />
          <span className="text-[13px] font-semibold text-foreground">Alxioum</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Today</span>
        </div>

        <div className="min-h-[220px] space-y-3">
          <AnimatePresence>
            {step >= 0 && (
              <motion.div key="user1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <Bubble tone="user">Move my dentist appointment to Friday at 4.</Bubble>
              </motion.div>
            )}
            {step >= 1 && (
              <motion.div key="ai1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                <AiAvatar />
                <Bubble>I found your dentist appointment.</Bubble>
              </motion.div>
            )}
            {step >= 2 && step < 4 && (
              <motion.div key="card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-8 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
                <p className="text-[12.5px] text-foreground">
                  Tuesday, Aug 18 · 3:00–4:00 PM
                  <br />
                  Move to <strong>Friday, 4:00 PM</strong>?
                </p>
                <div className="mt-2 flex gap-1.5">
                  <span className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${step === 3 ? "bg-accent text-accent-foreground" : "bg-accent/90 text-accent-foreground"}`}>
                    <Check className="h-3 w-3" /> Confirm
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
                    <X className="h-3 w-3" /> Cancel
                  </span>
                </div>
              </motion.div>
            )}
            {step >= 4 && (
              <motion.div key="ai2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                <AiAvatar />
                <Bubble>Done. Your appointment has been moved.</Bubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,hsl(var(--accent-soft)),transparent)] opacity-60" />
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
      <Bot className="h-3.5 w-3.5 text-accent" />
    </div>
  );
}

function Bubble({ children, tone = "ai" }: { children: React.ReactNode; tone?: "ai" | "user" }) {
  return (
    <div
      className={
        tone === "user"
          ? "max-w-[80%] rounded-2xl bg-accent px-3 py-2 text-[12.5px] text-accent-foreground"
          : "max-w-[80%] rounded-2xl border border-border bg-background px-3 py-2 text-[12.5px] text-foreground"
      }
    >
      {children}
    </div>
  );
}
