import { Calendar, CheckSquare, BrainCircuit, Wallet, Mail, Plus } from "lucide-react";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const agents = [
  { label: "Calendar Agent", icon: Calendar, live: true },
  { label: "Tasks Agent", icon: CheckSquare, live: false },
  { label: "Memory Agent", icon: BrainCircuit, live: false },
  { label: "Finance Agent", icon: Wallet, live: false },
  { label: "Email Agent", icon: Mail, live: false },
  { label: "More agents later", icon: Plus, live: false },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="The architecture"
          title="One intelligence. Multiple agents."
          subtitle="A single Head Agent understands what you need and routes it to the specialist agent responsible for that part of your life."
        />

        <Reveal delay={0.1}>
          <div className="mx-auto mt-16 flex max-w-3xl flex-col items-center">
            <Node label="ALXIOUM" primary />
            <Connector />
            <Node label="Head Agent" />
            <Connector />

            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {agents.map((agent) => (
                <div
                  key={agent.label}
                  className={
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center " +
                    (agent.live
                      ? "border-indigo-400/30 bg-indigo-500/[0.08]"
                      : "border-dashed border-white/12 bg-white/[0.015]")
                  }
                >
                  <agent.icon className={"h-5 w-5 " + (agent.live ? "text-indigo-300" : "text-white/30")} />
                  <span className={"text-[12.5px] font-medium " + (agent.live ? "text-white" : "text-white/45")}>
                    {agent.label}
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                      (agent.live ? "bg-indigo-500/25 text-indigo-200" : "bg-white/[0.05] text-white/35")
                    }
                  >
                    {agent.live ? "Live in MVP" : "Coming soon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-10 max-w-xl text-center text-[13.5px] leading-relaxed text-white/40">
            Today, only the Calendar Agent is live. Every other agent shown here is part of the roadmap —
            not the current product.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

function Node({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <div
      className={
        "rounded-xl border px-6 py-3 text-[13.5px] font-semibold tracking-tight " +
        (primary
          ? "border-indigo-400/40 bg-gradient-to-br from-indigo-500/25 to-violet-500/25 text-white shadow-[0_0_50px_-15px_rgba(99,102,241,0.6)]"
          : "border-white/15 bg-white/[0.04] text-white/80")
      }
    >
      {label}
    </div>
  );
}

function Connector() {
  return <div className="my-3 h-8 w-px bg-gradient-to-b from-white/25 to-white/5" />;
}
