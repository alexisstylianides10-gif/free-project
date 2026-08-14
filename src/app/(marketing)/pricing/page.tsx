import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { PricingCards } from "@/components/marketing/PricingCards";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <ScrollReveal>
        <div className="text-center">
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Simple pricing</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">Start free. Upgrade when you need more AI actions.</p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <PricingCards />
      </ScrollReveal>

      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        Prices in EUR. Manually adding events, tasks, or memories in the app never counts against your AI action limit — only
        messages sent to Alxioum in Chat do.
      </p>
    </div>
  );
}
