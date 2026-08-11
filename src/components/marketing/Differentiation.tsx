import { ArrowRight, MessageCircle, Check } from "lucide-react";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const traditional = ["User asks", "AI answers", "User does the work"];
const alxioum = ["User tells", "Alxioum understands", "Alxioum asks for confirmation", "Alxioum executes"];

export function Differentiation() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="The difference" title="Don't ask AI. Tell it." />

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <Reveal delay={0.05}>
            <FlowCard
              label="Traditional AI"
              icon={<MessageCircle className="h-4 w-4" />}
              steps={traditional}
              muted
            />
          </Reveal>
          <Reveal delay={0.15}>
            <FlowCard
              label="Alxioum"
              icon={<Check className="h-4 w-4" />}
              steps={alxioum}
            />
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-10 max-w-xl text-center text-[14px] leading-relaxed text-white/40">
            To be clear: this isn&apos;t a claim that ChatGPT or Claude can&apos;t reason about your
            request. It&apos;s that Alxioum&apos;s product is built end-to-end around executing the
            action — with your confirmation — instead of stopping at a conversation.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

function FlowCard({
  label,
  icon,
  steps,
  muted,
}: {
  label: string;
  icon: React.ReactNode;
  steps: string[];
  muted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-6 sm:p-8 " +
        (muted
          ? "border-white/10 bg-white/[0.02]"
          : "border-indigo-400/25 bg-gradient-to-b from-indigo-500/[0.08] to-transparent")
      }
    >
      <div
        className={
          "mb-6 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold " +
          (muted ? "bg-white/[0.06] text-white/50" : "bg-indigo-500/20 text-indigo-200")
        }
      >
        {icon}
        {label}
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12.5px] font-semibold " +
                (muted ? "bg-white/[0.06] text-white/40" : "bg-indigo-500/25 text-indigo-200")
              }
            >
              {i + 1}
            </div>
            <p className={"text-[14.5px] font-medium " + (muted ? "text-white/55" : "text-white/90")}>
              {step}
            </p>
            {i < steps.length - 1 && (
              <ArrowRight className={"ml-auto h-3.5 w-3.5 shrink-0 " + (muted ? "text-white/15" : "text-white/20")} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
