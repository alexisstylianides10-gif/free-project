"use client";

import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";

interface WeeklyReviewData {
  businessName: string;
  newCustomers: number;
  revenueChange: number | null;
  experimentsStarted: number;
  experimentsCompleted: number;
  missionsCompleted: number;
  insightsRaised: number;
}

export function WeeklyReviewCard({ businessId, onPlanNextWeek }: { businessId: string; onPlanNextWeek: () => void }) {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [review, setReview] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/business/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't load your weekly review.");
      setReview(json.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your weekly review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Weekly Review</p>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
            {review ? "Refresh" : "Show this week"}
          </Button>
        </div>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {review && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px] sm:grid-cols-3">
              <ReviewStat label="New customers" value={String(review.newCustomers)} />
              <ReviewStat label="Revenue change" value={review.revenueChange !== null ? `${review.revenueChange >= 0 ? "+" : ""}${review.revenueChange}` : "No data"} />
              <ReviewStat label="Experiments started" value={String(review.experimentsStarted)} />
              <ReviewStat label="Experiments completed" value={String(review.experimentsCompleted)} />
              <ReviewStat label="Missions completed" value={String(review.missionsCompleted)} />
              <ReviewStat label="Insights raised" value={String(review.insightsRaised)} />
            </div>
            <Button onClick={onPlanNextWeek} className="mt-4 w-full justify-center">
              Create Next Week&apos;s Plan
            </Button>
          </>
        )}
        {!review && !loading && !error && <p className="text-[12.5px] text-muted-foreground">See how the last 7 days actually went.</p>}
      </CardContent>
    </Card>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
