"use client";

import { useState } from "react";
import { useAlxioum } from "@/lib/store";

/** Shared "call a Stripe endpoint, redirect to the returned URL" logic for Settings' billing buttons (plan checkout, credit-pack checkout, billing portal). */
export function useBillingAction() {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string, body: Record<string, unknown> | undefined, key: string) {
    setBusyKey(key);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (!res.ok) throw new Error(res.status === 501 ? "Billing isn't live yet — check back soon." : (json.error ?? "Something went wrong."));
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusyKey(null);
    }
  }

  return { go, busyKey, error };
}
