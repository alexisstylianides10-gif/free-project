import { Database, ScanEye, Eye, Trash2 } from "lucide-react";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const points = [
  {
    icon: Database,
    title: "Stored in Alxioum's database",
    body: "Your data lives in Alxioum's own database, not scattered across third-party tools.",
  },
  {
    icon: ScanEye,
    title: "Minimum data per request",
    body: "Only the specific information needed to handle your request is sent to the AI model — never your whole history.",
  },
  {
    icon: Eye,
    title: "See what Alxioum knows",
    body: "You can review exactly what's stored about you, in plain language, at any time.",
  },
  {
    icon: Trash2,
    title: "Delete anytime",
    body: "Remove any stored information whenever you want. No hoops.",
  },
];

export function Privacy() {
  return (
    <section id="privacy" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="Privacy" title="Your data. Your control." />

        <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-2">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="flex h-full gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0a0a10]">
                  <p.icon className="h-4 w-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-semibold text-white">{p.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">{p.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
