"use client";

import { motion } from "framer-motion";
import { CalendarDays, CheckSquare, Bell, StickyNote, Mail, Wallet } from "lucide-react";

const APPS = [
  { label: "Calendar", icon: CalendarDays },
  { label: "Tasks", icon: CheckSquare },
  { label: "Reminders", icon: Bell },
  { label: "Notes", icon: StickyNote },
  { label: "Email", icon: Mail },
  { label: "Finances", icon: Wallet },
];

export function Problem() {
  return (
    <section className="relative px-6 py-28 md:py-40">
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance text-[34px] font-semibold leading-tight tracking-tight text-white md:text-[48px]"
        >
          Your life shouldn&apos;t require
          <br />
          12 different apps.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-x-6 gap-y-9 sm:grid-cols-6"
        >
          {APPS.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-2.5 opacity-50">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10">
                <Icon className="h-[18px] w-[18px] text-white/50" strokeWidth={1.6} />
              </div>
              <span className="text-[11.5px] text-white/40">{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16 max-w-md"
        >
          <p className="text-[15px] leading-relaxed text-white/40">You shouldn&apos;t have to manage all of them.</p>
          <p className="mt-1 text-[19px] font-medium leading-relaxed text-white">
            You should just tell your AI what you want.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
