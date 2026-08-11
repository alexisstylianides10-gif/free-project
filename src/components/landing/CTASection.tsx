"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Orb } from "./Orb";
import { WaitlistDialog } from "./WaitlistDialog";

export function CTASection() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden px-6 py-32 text-center md:py-44">
      <Orb size={180} className="mb-10 opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-balance text-[34px] font-semibold leading-tight tracking-tight text-white md:text-[52px]">
          Stop managing your life.
          <br />
          Start telling it what to do.
        </h2>

        <div className="mt-9 flex justify-center">
          <WaitlistDialog>
            <button className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#8f80ff] to-[#6a5aef] px-8 py-4 text-[15px] font-medium text-white shadow-[0_0_44px_-6px_rgba(124,109,255,0.7)] transition-transform hover:scale-[1.03]">
              Join the Alxioum Waitlist <ArrowRight className="h-4 w-4" />
            </button>
          </WaitlistDialog>
        </div>

        <p className="mt-6 text-[13px] text-white/35">Alxioum is currently in development.</p>
      </motion.div>
    </section>
  );
}
