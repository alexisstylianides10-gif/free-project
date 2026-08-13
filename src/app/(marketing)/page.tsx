import { HeroMockup } from "@/components/marketing/HeroMockup";
import { HeroIntro } from "@/components/marketing/HeroIntro";
import { SignedInRedirect } from "@/components/marketing/SignedInRedirect";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";
import { MyDayMockup } from "@/components/marketing/MyDayMockup";
import { AgentDiagram } from "@/components/marketing/AgentDiagram";
import Link from "next/link";
import { Check, MessageSquare, Brain, ShieldCheck, Zap, CircleCheck } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";

const EXAMPLES = [
  "Add tennis tomorrow at 6.",
  "What's on my calendar this week?",
  "Move my dentist appointment to Thursday.",
  "Remind me to study tonight.",
  "Create a high-priority task to call the dentist.",
  "Remember that I prefer morning meetings.",
];

const FRAGMENTS = ["Calendar", "Tasks", "Notes", "Reminders", "Email"];

const TRUST_PRINCIPLES = [
  { icon: ShieldCheck, title: "Permission before action.", body: "Every create, update, or delete waits for your explicit Confirm." },
  { icon: Brain, title: "See what Alxioum knows.", body: "A dedicated page shows exactly what's stored about you, in plain language." },
  { icon: Check, title: "Delete your data.", body: "Remove one item or everything, permanently, whenever you want." },
  { icon: Zap, title: "Minimum necessary context.", body: "Alxioum retrieves only what's relevant to your request — never your whole database." },
  { icon: MessageSquare, title: "Your data isn't dumped into every AI request.", body: "The model sees a short summary plus what it explicitly looks up, nothing more." },
];

const FLOW_STEPS = [
  { n: "01", title: "Tell it", body: "You tell Alxioum what you need, in plain language." },
  { n: "02", title: "Alxioum understands", body: "It figures out what you're asking and finds what's relevant." },
  { n: "03", title: "You confirm", body: "You review and confirm the exact action before anything changes." },
  { n: "04", title: "Alxioum acts", body: "It carries out the confirmed action against your data." },
  { n: "05", title: "Done", body: "You get a clear result — ask Alxioum anytime what it's done and why." },
];

export default function LandingPage() {
  return (
    <>
      <SignedInRedirect />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--accent-soft))_0%,transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pb-28 lg:pt-24">
          <HeroIntro />
          <HeroMockup />
        </div>
      </section>

      {/* The problem */}
      <ScrollReveal>
        <section className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h2 className="text-[26px] font-semibold tracking-tight text-foreground">Your digital life is fragmented.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            Calendar here. Tasks there. Reminders somewhere else. You shouldn&apos;t have to open five apps to organize one day.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-2">
            {FRAGMENTS.map((f) => (
              <span key={f} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
          <div className="mx-auto my-4 h-8 w-px bg-border" />
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-[13.5px] font-semibold text-accent">
            <Brain className="h-4 w-4" /> One assistant for your digital life
          </span>
        </section>
      </ScrollReveal>

      {/* Tell it what you need */}
      <ScrollReveal>
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="text-center">
            <h2 className="text-[26px] font-semibold tracking-tight text-foreground">Tell it what you need.</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">No commands to memorize. No settings to configure first.</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-3xl gap-2.5 sm:grid-cols-2">
            {EXAMPLES.map((e) => (
              <div key={e} className="rounded-xl border border-border bg-surface px-4 py-3 text-[13.5px] text-foreground shadow-subtle">
                &ldquo;{e}&rdquo;
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* From conversation to action */}
      <ScrollReveal>
        <section id="how-it-works" className="border-y border-border/60 bg-muted/20 py-20">
          <div className="mx-auto max-w-5xl px-5">
            <div className="text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-accent">How it works</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">From conversation to action.</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-5">
              {FLOW_STEPS.map((s, i) => (
                <div key={s.n} className="relative text-center">
                  {i < FLOW_STEPS.length - 1 && <div className="absolute right-[-12px] top-5 hidden h-px w-6 bg-border sm:block" />}
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-[13px] font-semibold text-accent">{s.n}</div>
                  <p className="mt-3 text-[13.5px] font-semibold text-foreground">{s.title}</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* My Day */}
      <ScrollReveal>
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-accent">My Day</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">Your day, in one place.</h2>
              <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
                Real events, real tasks, real free time — never invented. If nothing&apos;s scheduled, Alxioum just says so.
              </p>
            </div>
            <MyDayMockup />
          </div>
        </section>
      </ScrollReveal>

      {/* Privacy / trust */}
      <ScrollReveal>
        <section className="border-y border-border/60 bg-muted/20 py-20">
          <div className="mx-auto max-w-5xl px-5">
            <div className="text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-accent">Trust</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">Your information stays yours.</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {TRUST_PRINCIPLES.map((p) => (
                <div key={p.title} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                  <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">{p.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* One brain, many capabilities */}
      <ScrollReveal>
        <section id="agents" className="mx-auto max-w-5xl px-5 py-20">
          <div className="text-center">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-accent">Architecture</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">One brain. Many capabilities.</h2>
            <p className="mx-auto mt-2 max-w-lg text-[15px] text-muted-foreground">
              A single Head Agent routes requests to specialized agents. Calendar, Tasks, and Memory are live today — more are on the way.
            </p>
          </div>
          <AgentDiagram />
        </section>
      </ScrollReveal>

      {/* Built to grow */}
      <ScrollReveal>
        <section className="border-y border-border/60 bg-muted/20 py-16">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 className="text-[24px] font-semibold tracking-tight text-foreground">Built to grow with you.</h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Alxioum starts as a focused calendar-and-tasks AI assistant. The Head Agent and tool architecture behind it are
              built to expand — new agents get added by registering their tools, not rewriting the product.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* Pricing teaser */}
      <ScrollReveal>
        <section className="border-y border-border/60 bg-muted/20 py-20">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <h2 className="text-[26px] font-semibold tracking-tight text-foreground">Simple pricing.</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Start free. Upgrade for more AI actions.</p>
            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              {(["Free", "Pro"] as const).map((id) => (
                <div key={id} className={`flex-1 rounded-xl border p-5 text-left ${id === "Pro" ? "border-accent bg-accent-soft/30" : "border-border bg-surface"}`}>
                  <p className="text-[13px] font-semibold text-muted-foreground">{PLANS[id].name}</p>
                  <p className="mt-1 text-[24px] font-semibold text-foreground">
                    €{PLANS[id].priceMonthlyEUR}
                    <span className="text-[13px] font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{PLANS[id].aiMessagesPerMonth} AI actions / month</p>
                </div>
              ))}
            </div>
            <Link href="/pricing" className="mt-6 inline-block text-[13.5px] font-semibold text-accent underline underline-offset-2">
              See full pricing details
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ */}
      <ScrollReveal>
        <section className="mx-auto max-w-2xl px-5 py-20">
          <h2 className="text-center text-[26px] font-semibold tracking-tight text-foreground">Frequently asked questions</h2>
          <FAQAccordion />
        </section>
      </ScrollReveal>

      {/* Final CTA */}
      <ScrollReveal>
        <section className="mx-auto max-w-3xl px-5 pb-24 text-center">
          <CircleCheck className="mx-auto mb-4 h-8 w-8 text-accent" />
          <h2 className="text-[26px] font-semibold tracking-tight text-foreground">Ready to try it?</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">Free to start. No credit card required.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-foreground transition-opacity hover:opacity-90">
            Get Early Access
          </Link>
        </section>
      </ScrollReveal>
    </>
  );
}
