import { Container } from "./Container";
import { Glow } from "./Glow";
import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="relative overflow-hidden py-28 sm:py-36">
      <Glow className="left-1/2 top-1/2 h-[420px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-brand-500/20" />

      <Container className="relative max-w-2xl text-center">
        <Reveal>
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-paper sm:text-[44px]">
            Your life is full of things to manage.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-4 text-[17px] text-paper/55 sm:text-[19px]">Let Alxioum handle them.</p>
        </Reveal>

        <Reveal delay={0.16} className="mx-auto mt-10 max-w-md">
          <WaitlistForm />
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-6 text-[13px] text-paper/35">Alxioum is currently in development.</p>
        </Reveal>
      </Container>
    </section>
  );
}
