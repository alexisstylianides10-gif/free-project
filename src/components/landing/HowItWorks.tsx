"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-28 md:py-40">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="How it works" title="From a sentence to a done thing." />

        <div className="relative mt-20 grid gap-16 md:grid-cols-4 md:gap-6">
          <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />

          <Step n="01" title="Tell it">
            <ChatBubble text="Move my dentist appointment to Friday at 4." />
          </Step>

          <Step n="02" title="Alxioum understands">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Sparkles className="h-4 w-4 shrink-0 text-[#9f8cff]" />
              <p className="text-[13px] leading-relaxed text-white/60">
                The AI figures out what you&apos;re asking and which tool needs to handle it.
              </p>
            </div>
          </Step>

          <Step n="03" title="Confirm">
            <ConfirmCard />
          </Step>

          <Step n="04" title="Done.">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#7c6dff]/25 bg-[#7c6dff]/[0.06] p-4">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c6dff]/20">
                <Check className="h-3.5 w-3.5 text-[#9f8cff]" />
              </div>
              <p className="text-[13px] leading-relaxed text-white/60">Your AI handles the action.</p>
            </div>
          </Step>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col"
    >
      <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#05050a] text-[12px] font-medium text-white/50">
        {n}
      </div>
      <h3 className="mt-5 text-[16px] font-semibold text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

function ChatBubble({ text }: { text: string }) {
  return (
    <div className="inline-block rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[13px] leading-relaxed text-white/80">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

function ConfirmCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[13px] font-medium text-white">Move Dentist Appointment</p>
      <p className="mt-0.5 text-[12px] text-white/40">Friday · 4:00 PM</p>
      <div className="mt-3.5 flex gap-2">
        <button className="flex-1 rounded-lg bg-[#7c6dff] px-3 py-1.5 text-[12px] font-medium text-white">
          Confirm
        </button>
        <button className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-white/50">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl"
    >
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#9f8cff]/80">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-[30px] font-semibold leading-tight tracking-tight text-white md:text-[42px]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-white/45">{sub}</p>}
    </motion.div>
  );
}
