"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import type { WeakAreaPlan } from "@/lib/study/types";

const MAX_LENGTH = 1000;

export default function NewWeakAreaPlanPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/study/weak-area-plan", {
        method: "POST",
        body: JSON.stringify({ subjectId, description: description.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't build a plan for that.");
      const plan = json.plan as WeakAreaPlan;
      router.push(`/app/school/subjects/${subjectId}/weak-area/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build a plan for that.");
      setBusy(false);
    }
  }

  if (busy) {
    return <LoadingScreen message="Building your improvement plan… this takes a little while, hang tight." fullScreen={false} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">What are you struggling with?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe it in your own words — as specific as you can. We&apos;ll build you real practice materials, a
          plan, or resources depending on what actually helps.
        </p>
      </div>

      {error && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      <form onSubmit={submit} className="space-y-3">
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="e.g. My English reading and writing isn't very good. I struggle to understand what I read and I make a lot of mistakes when I write."
          rows={7}
          className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
        />
        <p className="text-right text-2xs text-muted-foreground">
          {description.length}/{MAX_LENGTH}
        </p>
        <Button type="submit" size="lg" className="w-full" disabled={!description.trim() || busy}>
          Build my plan
        </Button>
      </form>
    </div>
  );
}
