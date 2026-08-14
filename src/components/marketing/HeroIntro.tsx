"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function HeroIntro() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.p variants={item} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[12.5px] font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Your personal AI command center
      </motion.p>
      <motion.h1 variants={item} className="text-[38px] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[46px]">
        AI that doesn&apos;t just answer.
        <br />
        <span className="text-gradient-accent">It acts.</span>
      </motion.h1>
      <motion.p variants={item} className="mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground">
        Alxioum turns natural-language requests into real actions across your calendar, tasks, and memory — always with your
        permission first.
      </motion.p>
      <motion.div variants={item} className="mt-7 flex flex-wrap gap-3">
        <Link href="/login" className="rounded-lg bg-gradient-accent px-5 py-3 text-[14.5px] font-semibold text-accent-foreground shadow-glow-accent transition-opacity hover:opacity-90">
          Get Early Access
        </Link>
        <Link href="#how-it-works" className="rounded-lg border border-border px-5 py-3 text-[14.5px] font-semibold text-foreground transition-colors hover:bg-muted">
          See How It Works
        </Link>
      </motion.div>
    </motion.div>
  );
}
