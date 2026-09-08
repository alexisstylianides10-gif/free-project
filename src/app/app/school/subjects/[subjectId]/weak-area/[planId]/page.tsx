"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2, TriangleAlert, Sparkles, ListChecks, BookOpen as BookIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useWeakAreaPlans } from "@/lib/hooks/study";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { cn } from "@/lib/utils";

export default function WeakAreaPlanPage({ params }: { params: Promise<{ subjectId: string; planId: string }> }) {
  const { subjectId, planId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: plans, loading, refetch } = useWeakAreaPlans(user?.id, subjectId);
  const plan = plans.find((p) => p.id === planId);
  const [deleting, setDeleting] = useState(false);
  const [openExercise, setOpenExercise] = useState<number | null>(null);

  async function deletePlan() {
    if (!supabase || deleting) return;
    if (!confirm("Delete this plan?")) return;
    setDeleting(true);
    try {
      await supabase.from("weak_area_plans").delete().eq("id", planId);
      router.push(`/app/school/subjects/${subjectId}`);
    } finally {
      setDeleting(false);
      refetch();
    }
  }

  if (loading && !plan) {
    return <LoadingScreen message="Loading your plan…" fullScreen={false} />;
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          This plan couldn&apos;t be found. It may have been deleted.
        </CardContent>
      </Card>
    );
  }

  if (plan.status === "failed") {
    return (
      <Card className="border border-danger/40">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-danger" />
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t build a plan for this</p>
          <p className="max-w-xs text-sm text-muted-foreground">Something went wrong. Try describing the problem again.</p>
        </CardContent>
      </Card>
    );
  }

  const content = plan.plan;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your problem</p>
          <p className="mt-1 text-sm text-foreground">{plan.description}</p>
        </div>
        <button
          onClick={deletePlan}
          disabled={deleting}
          aria-label="Delete plan"
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {content?.summary && (
        <Card className="border-accent/30">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm text-foreground">{content.summary}</p>
          </CardContent>
        </Card>
      )}

      {Array.isArray(content?.roadmap) && content.roadmap.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5 text-accent" /> Your plan
          </h2>
          <div className="space-y-2">
            {content.roadmap.map((step, i) => (
              <Card key={i}>
                <CardContent className="flex gap-3 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(content?.exercises) && content.exercises.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Practice</h2>
          <div className="space-y-3">
            {content.exercises.map((ex, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-foreground">{ex.title}</p>
                  {ex.passage && (
                    <p className="mt-2 rounded-xl bg-muted p-3 text-sm leading-relaxed text-foreground">{ex.passage}</p>
                  )}
                  <div className="mt-3 space-y-3">
                    {(Array.isArray(ex.questions) ? ex.questions : []).map((q, qi) => {
                      const key = i * 1000 + qi;
                      const open = openExercise === key;
                      return (
                        <div key={qi} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                          <p className="text-sm text-foreground">{q.question}</p>
                          <button
                            type="button"
                            onClick={() => setOpenExercise(open ? null : key)}
                            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-accent"
                          >
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                            {open ? "Hide answer" : "Show answer"}
                          </button>
                          {open && <p className="mt-1.5 text-sm text-muted-foreground">{q.answer}</p>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(content?.resources) && content.resources.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <BookIcon className="h-3.5 w-3.5 text-accent" /> Recommended
          </h2>
          <div className="space-y-2">
            {content.resources.map((r, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-foreground">
                    {r.title}
                    {r.author && <span className="font-normal text-muted-foreground"> — {r.author}</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.why}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
