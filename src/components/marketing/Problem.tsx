"use client";

import { motion } from "framer-motion";
import { Calendar, CheckSquare, StickyNote, Bell, Mail, Wallet } from "lucide-react";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const scattered = [
  { icon: Calendar, label: "Calendar", style: "left-[4%] top-[6%] rotate-[-6deg]" },
  { icon: CheckSquare, label: "Tasks", style: "left-[58%] top-[2%] rotate-[4deg]" },
  { icon: StickyNote, label: "Notes", style: "left-[80%] top-[38%] rotate-[7deg]" },
  { icon: Bell, label: "Reminders", style: "left-[2%] top-[56%] rotate-[5deg]" },
  { icon: Mail, label: "Email", style: "left-[30%] top-[72%] rotate-[-4deg]" },
  { icon: Wallet, label: "Finance", style: "left-[64%] top-[68%] rotate-[-7deg]" },
];

export function Problem() {
  return (
    <section id="problem" className="relative py-24 sm:py-32">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <SectionHeading
          align="left"
          eyebrow="The problem"
          title="Your life shouldn't require 12 different apps."
          subtitle={
            <>
              Calendar. Tasks. Notes. Reminders. Email. Finance. You&apos;re already jumping between all
              of them every day. The problem isn&apos;t a lack of AI — most of these apps already have
              some. The problem is that AI usually stops at giving you an answer, and leaves the actual
              work to you.
              <br />
              <br />
              <span className="text-paper/80">Alxioum is designed around taking the action, not just describing it.</span>
            </>
          }
        />

        <Reveal delay={0.1}>
          <div className="relative mx-auto h-[320px] w-full max-w-md">
            {scattered.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 * i }}
                className={`absolute flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-paper/50 ${item.style}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 to-brand-600/20 shadow-[0_0_60px_-10px_rgba(201,143,78,0.5)] backdrop-blur"
            >
              <span className="text-[13px] font-semibold tracking-tight text-paper">ALXIOUM</span>
            </motion.div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
