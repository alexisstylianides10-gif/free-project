"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SectionHeading } from "./HowItWorks";

const ROADMAP = [
  { label: "Calendar", status: "In development" },
  { label: "Tasks", status: "Planned" },
  { label: "Habits", status: "Planned" },
  { label: "Memory", status: "Planned" },
  { label: "Finance", status: "Planned" },
  { label: "Email", status: "Planned" },
  { label: "More", status: "Planned" },
];

export function Vision() {
  return (
    <section className="relative overflow-hidden px-6 py-28 md:py-40">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(50% 40% at 50% 50%, rgba(124,109,255,0.10) 0%, transparent 70%)" }}
      />
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="The bigger vision"
          title="One intelligence. Your entire life."
          sub="Alxioum starts with simple actions. Then it grows — one AI, gradually coordinating everything."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex flex-wrap items-center gap-x-1 gap-y-6"
        >
          {ROADMAP.map((item, i) => (
            <div key={item.label} className="flex items-center gap-1">
              <div
                className={`flex flex-col gap-1.5 rounded-xl border px-4 py-3 ${
                  i === 0 ? "border-[#7c6dff]/40 bg-[#7c6dff]/[0.08]" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <span className={`text-[13.5px] font-medium ${i === 0 ? "text-white" : "text-white/50"}`}>
                  {item.label}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    i === 0 ? "text-[#9f8cff]" : "text-white/25"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              {i < ROADMAP.length - 1 && <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-white/15" />}
            </div>
          ))}
        </motion.div>

        <p className="mt-10 text-[13px] text-white/35">
          These are the areas we&apos;re building toward — not features available today. We&apos;ll ship them one at a
          time, starting with calendar actions.
        </p>
      </div>
    </section>
  );
}
