"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const RINGS = [0, 0.5, 1];
const BARS = [
  { min: 3, max: 13, delay: 0 },
  { min: 5, max: 16, delay: 0.12 },
  { min: 4, max: 10, delay: 0.24 },
  { min: 6, max: 15, delay: 0.06 },
];

export function VoiceButton({ listening, onClick }: { listening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Stop voice input" : "Voice input"}
      aria-pressed={listening}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
        listening ? "bg-danger text-white" : "text-muted-foreground hover:bg-muted"
      )}
    >
      <AnimatePresence>
        {listening &&
          RINGS.map((delay) => (
            <motion.span
              key={delay}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-danger"
              initial={{ scale: 1, opacity: 0.55 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay }}
            />
          ))}
      </AnimatePresence>

      <motion.span
        animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 1.6, repeat: listening ? Infinity : 0, ease: "easeInOut" }}
        className="relative z-10 flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {listening ? (
            <motion.span
              key="bars"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.16 }}
              className="flex h-4 items-center gap-[3px]"
            >
              {BARS.map((bar, i) => (
                <motion.span
                  key={i}
                  className="w-[2.5px] rounded-full bg-white"
                  animate={{ height: [bar.min, bar.max, bar.min * 1.4, bar.max * 0.7, bar.min] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: bar.delay }}
                />
              ))}
            </motion.span>
          ) : (
            <motion.span key="icon" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.16 }}>
              <Mic className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
