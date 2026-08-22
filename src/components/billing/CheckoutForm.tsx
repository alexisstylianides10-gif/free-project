"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getStripePromise } from "@/lib/billing/stripePromise";
import { stripeAppearance } from "@/lib/billing/stripeAppearance";
import { Button } from "@/components/ui/Button";

function InnerForm({ submitLabel, onSuccess }: { submitLabel: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setError(null);
    setSubmitting(true);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Your card couldn't be charged. Try again.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onSuccess();
      return;
    }
    setError("Payment wasn't completed. Try again.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
      </Button>
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Payments are processed securely by Stripe.
      </p>
    </form>
  );
}

/** The custom in-app checkout form — a Stripe Payment Element styled to
 * match Alxioum's theme, confirmed in place via confirmPayment() so the
 * customer never leaves the app or sees Stripe-hosted Checkout. */
export function CheckoutForm({
  clientSecret,
  submitLabel,
  onSuccess,
}: {
  clientSecret: string;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const { resolved } = useTheme();
  return (
    <Elements key={clientSecret} stripe={getStripePromise()} options={{ clientSecret, appearance: stripeAppearance(resolved) }}>
      <InnerForm submitLabel={submitLabel} onSuccess={onSuccess} />
    </Elements>
  );
}
