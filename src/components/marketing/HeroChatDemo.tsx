"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

type Step = "user" | "thinking" | "confirm" | "resolved";

const HOLD_BEFORE_ASSISTANT = 900;
const THINKING_DURATION = 1100;
const AUTO_CONFIRM_DELAY = 2600;
const HOLD_AFTER_RESOLVE = 2800;
const RESTART_DELAY = 700;

export function HeroChatDemo() {
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState<Step>("user");
  const [resolution, setResolution] = useState<"confirmed" | "cancelled" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  useEffect(() => {
    setStep("user");
    setResolution(null);

    const t1 = setTimeout(() => setStep("thinking"), HOLD_BEFORE_ASSISTANT);
    const t2 = setTimeout(() => setStep("confirm"), HOLD_BEFORE_ASSISTANT + THINKING_DURATION);
    const t3 = setTimeout(
      () => resolve("confirmed"),
      HOLD_BEFORE_ASSISTANT + THINKING_DURATION + AUTO_CONFIRM_DELAY
    );
    timers.current.push(t1, t2, t3);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  function resolve(kind: "confirmed" | "cancelled") {
    clearTimers();
    setStep("resolved");
    setResolution(kind);
    const t = setTimeout(() => setCycle((c) => c + 1), HOLD_AFTER_RESOLVE + RESTART_DELAY);
    timers.current.push(t);
  }

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_70px_-20px_rgba(201,143,78,0.35)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="h-2 w-2 rounded-full bg-sage" />
        <span className="text-[12px] font-medium text-paper/50">Alxioum · Calendar Agent</span>
      </div>

      <div className="flex min-h-[220px] flex-col justify-end gap-3">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`user-${cycle}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2.5 text-[13.5px] font-medium leading-snug text-ink-950"
          >
            Move my dentist appointment to Friday at 4.
          </motion.div>

          {step === "thinking" && (
            <motion.div
              key={`thinking-${cycle}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-3"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}

          {(step === "confirm" || step === "resolved") && (
            <motion.div
              key={`assistant-${cycle}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5"
            >
              <p className="text-[13.5px] leading-snug text-paper/90">
                I found your dentist appointment. Move it to Friday at 4:00 PM?
              </p>

              <AnimatePresence mode="wait">
                {step === "confirm" && (
                  <motion.div
                    key="buttons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2.5 flex gap-2"
                  >
                    <button
                      onClick={() => resolve("confirmed")}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-transform hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </button>
                    <button
                      onClick={() => resolve("cancelled")}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12.5px] font-medium text-paper/70 transition-colors hover:bg-white/5"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </motion.div>
                )}

                {step === "resolved" && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className={
                      "mt-2.5 flex items-center gap-1.5 text-[12.5px] font-medium " +
                      (resolution === "confirmed" ? "text-sage" : "text-paper/50")
                    }
                  >
                    {resolution === "confirmed" ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Done. Appointment moved.
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" /> Okay, I&apos;ll leave it as is.
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
