"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Orb } from "./Orb";
import { WaitlistDialog } from "./WaitlistDialog";

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
      {/* ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 38%, rgba(124,109,255,0.16) 0%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black_10%,transparent_75%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <Orb size={260} className="mb-6 md:mb-8" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <h1 className="text-balance text-[15vw] font-semibold leading-[0.98] tracking-tight text-white sm:text-[80px] md:text-[104px]">
          Your life.
          <br />
          <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
            One AI.
          </span>
        </h1>

        <p className="mt-7 max-w-xl text-balance text-[17px] leading-relaxed text-white/70 md:text-[19px]">
          Alxioum is the AI that turns what you say into what gets done.
        </p>
        <p className="mt-3 max-w-lg text-balance text-[14.5px] leading-relaxed text-white/40 md:text-[15.5px]">
          Forget jumping between calendars, task apps, reminders, and endless menus.
          <br className="hidden md:block" /> Just tell Alxioum what you need.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <WaitlistDialog>
            <button className="rounded-full bg-gradient-to-b from-[#8f80ff] to-[#6a5aef] px-7 py-3.5 text-[14.5px] font-medium text-white shadow-[0_0_36px_-6px_rgba(124,109,255,0.7)] transition-transform hover:scale-[1.03]">
              Join the Waitlist
            </button>
          </WaitlistDialog>
          <a
            href="#how-it-works"
            className="flex items-center gap-1.5 rounded-full px-7 py-3.5 text-[14.5px] font-medium text-white/60 transition-colors hover:text-white"
          >
            See How It Works <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowDown className="h-4 w-4 text-white/20" />
      </motion.div>
    </section>
  );
}
