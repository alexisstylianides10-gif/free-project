import { CalendarClock, BrainCircuit, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const steps = [
  {
    n: "01",
    title: "Tell it",
    icon: CalendarClock,
    body: "Just say what you need, in plain language.",
    example: "Schedule tennis Friday at 6.",
  },
  {
    n: "02",
    title: "Alxioum understands",
    icon: BrainCircuit,
    body: "The Head Agent identifies your intent and figures out which agent — and which action — the request requires.",
    example: null,
  },
  {
    n: "03",
    title: "Confirm",
    icon: ShieldCheck,
    body: "Nothing happens without your say-so. You get a clear confirmation card before anything changes.",
    example: null,
    card: true,
  },
  {
    n: "04",
    title: "Done",
    icon: CheckCircle2,
    body: "Alxioum executes the action and lets you know it's handled.",
    example: null,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="How it works" title="From words to done — in four steps." />

        <div className="relative mt-16 grid gap-6 md:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" />
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="relative flex flex-col">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a10]">
                    <step.icon className="h-[18px] w-[18px] text-indigo-300" />
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-white/25">{step.n}</span>
                </div>
                <h3 className="text-[16px] font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">{step.body}</p>

                {step.example && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] italic text-white/70">
                    &ldquo;{step.example}&rdquo;
                  </div>
                )}

                {step.card && (
                  <div className="mt-4 rounded-lg border border-indigo-400/20 bg-indigo-500/[0.06] px-3 py-2.5">
                    <p className="text-[12.5px] text-white/70">Book tennis court, Fri 6:00–7:00 PM?</p>
                    <div className="mt-2 flex gap-1.5">
                      <span className="rounded-md bg-indigo-500 px-2 py-1 text-[11px] font-semibold text-white">Confirm</span>
                      <span className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-medium text-white/50">Cancel</span>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
