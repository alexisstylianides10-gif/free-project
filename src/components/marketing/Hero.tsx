"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Container } from "./Container";
import { Glow } from "./Glow";
import { HeroChatDemo } from "./HeroChatDemo";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44">
      <Glow className="-top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 bg-brand-500/25" />
      <Glow className="right-[-140px] top-40 h-[360px] w-[360px] bg-brand-500/15" />

      <Container className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] font-medium text-paper/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            In active development
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-[42px] font-semibold leading-[1.06] tracking-tight text-paper sm:text-[56px] lg:text-[62px]"
          >
            AI that doesn&apos;t
            <br />
            just answer.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-brand-100 bg-clip-text text-transparent">
              It acts.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-lg text-[17px] leading-relaxed text-paper/55 sm:text-[19px]"
          >
            Alxioum turns conversations into actions across your digital life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/app"
              className="group flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14.5px] font-semibold text-ink-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[14.5px] font-medium text-paper/80 transition-colors hover:bg-white/5"
            >
              See How It Works
              <ChevronDown className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-5 text-[13px] text-paper/35"
          >
            Why Alxioum instead of ChatGPT or Claude? It doesn&apos;t just tell you what to do — it does it, with your confirmation.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <HeroChatDemo />
        </motion.div>
      </Container>
    </section>
  );
}
