"use client";

import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { useTriply } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const FREE_FEATURES = ["Basic trips", "Basic itinerary", "Basic group management", "Basic expenses", "Limited AI usage", "Basic polls"];

const PRO_FEATURES = [
  "Unlimited trips",
  "Advanced AI trip planning",
  "Unlimited AI itinerary changes",
  "Advanced itinerary optimization",
  "Advanced booking import",
  "Unlimited document storage",
  "Advanced expense tools",
  "Offline trip access",
  "Smart conflict detection",
  "Personalized recommendations",
];

export default function PremiumPage() {
  const router = useRouter();
  const profile = useTriply((s) => s.profile);
  const updateProfile = useTriply((s) => s.updateProfile);

  const isPro = profile.plan === "Travel Pro";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
          <Crown className="h-6 w-6 text-accent" />
        </div>
        <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-foreground">Travel Pro</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Everything you need for effortless group trips.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={cn("p-5", !isPro && "border-accent/40 ring-1 ring-accent/20")}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-foreground">Free</p>
            {!isPro && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Current</span>}
          </div>
          <p className="mt-1 text-[22px] font-semibold text-foreground">€0</p>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success" /> {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card className={cn("p-5", isPro && "border-accent/40 ring-1 ring-accent/20")}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-foreground">Travel Pro</p>
            {isPro && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Current</span>}
          </div>
          <p className="mt-1 text-[22px] font-semibold text-foreground">€9.99/mo</p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success" /> {f}
              </li>
            ))}
          </ul>
          <Button
            className="mt-5 w-full"
            disabled={isPro}
            onClick={() => {
              updateProfile({ plan: "Travel Pro" });
              router.push("/profile");
            }}
          >
            {isPro ? "Current plan" : "Upgrade to Travel Pro"}
          </Button>
        </Card>
      </div>

      <p className="text-center text-[12px] text-muted-foreground">All plans are unlocked in this testing environment — no payment method required.</p>
    </div>
  );
}
