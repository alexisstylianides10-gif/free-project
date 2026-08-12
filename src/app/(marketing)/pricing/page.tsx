import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-20">
      <div className="text-center">
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Simple pricing</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Start free. Upgrade when you need more AI actions.</p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <PlanCard planId="Free" />
        <PlanCard planId="Pro" highlight />
      </div>

      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        Prices in EUR. Manually adding events, tasks, or memories in the app never counts against your AI action limit — only
        messages sent to Alxioum in Chat do.
      </p>
    </div>
  );
}

function PlanCard({ planId, highlight }: { planId: "Free" | "Pro"; highlight?: boolean }) {
  const plan = PLANS[planId];
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-accent bg-accent-soft/30 shadow-card" : "border-border bg-surface"}`}>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-[34px] font-semibold tracking-tight text-foreground">€{plan.priceMonthlyEUR}</span>
        <span className="text-[13px] text-muted-foreground">/month</span>
      </p>
      {plan.priceYearlyEUR > 0 && <p className="mt-0.5 text-[12.5px] text-muted-foreground">or €{plan.priceYearlyEUR}/year</p>}
      <ul className="mt-5 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px] text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
          </li>
        ))}
      </ul>
      <Link
        href="/login?mode=signup"
        className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-[13.5px] font-semibold transition-opacity hover:opacity-90 ${
          highlight ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
        }`}
      >
        {planId === "Free" ? "Get started free" : "Get early access"}
      </Link>
    </div>
  );
}
