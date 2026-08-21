"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Brain, Layers, Play, Trash2, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { useStudyMaterials, useStudyTopics } from "@/lib/hooks/study";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import type { MaterialAnalysisFull } from "@/lib/study/types";

export default function MaterialDetailPage({ params }: { params: Promise<{ subjectId: string; materialId: string }> }) {
  const { subjectId, materialId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: materials, loading: materialsLoading, refetch: refetchMaterials } = useStudyMaterials(user?.id, subjectId);
  const { data: topicsAll, refetch: refetchTopics } = useStudyTopics(user?.id, subjectId);

  const material = materials.find((m) => m.id === materialId);
  const topics = topicsAll.filter((t) => t.material_id === materialId);

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isActive = material?.status === "pending" || material?.status === "analyzing";
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      await refetchMaterials();
      pollingRef.current = false;
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive, refetchMaterials]);

  useEffect(() => {
    if (material?.status === "analyzed") {
      refetchTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?.status]);

  async function retryAnalysis() {
    if (!material || retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await authedFetch("/api/study/analyze-material", {
        method: "POST",
        body: JSON.stringify({ materialId: material.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRetryError(body.error ?? "Analysis failed again. Try again in a moment.");
      }
      await refetchMaterials();
      await refetchTopics();
    } catch {
      setRetryError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setRetrying(false);
    }
  }

  async function deleteMaterial() {
    if (!material || !supabase || deleting) return;
    if (!confirm(`Delete "${material.title}"? Topics already extracted from it will stay.`)) return;
    setDeleting(true);
    try {
      if (material.storage_path) {
        await supabase.storage.from("study-materials").remove([material.storage_path]);
      }
      await supabase.from("study_materials").delete().eq("id", material.id);
      router.push(`/app/school/subjects/${subjectId}`);
    } finally {
      setDeleting(false);
    }
  }

  if (materialsLoading && !material) {
    return <LoadingScreen message="Loading material…" fullScreen={false} />;
  }

  if (!material) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          This material couldn&apos;t be found — it may have been deleted.
        </CardContent>
      </Card>
    );
  }

  if (material.status === "pending" || material.status === "analyzing") {
    return <LoadingScreen message="Analyzing your material…" fullScreen={false} />;
  }

  if (material.status === "failed") {
    return (
      <div className="space-y-4">
        <Card className="border border-danger/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <TriangleAlert className="h-6 w-6 text-danger" />
            <p className="text-sm font-semibold text-foreground">Analysis failed</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {retryError ?? "Something went wrong reading this material. You can try again."}
            </p>
            <Button variant="secondary" onClick={retryAnalysis} disabled={retrying} className="mt-2">
              <RotateCcw className="h-4 w-4" />
              {retrying ? "Retrying…" : "Try again"}
            </Button>
          </CardContent>
        </Card>
        <button
          type="button"
          onClick={deleteMaterial}
          disabled={deleting}
          className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete material
        </button>
      </div>
    );
  }

  const analysis = material.analysis as MaterialAnalysisFull | null;
  const stats = [
    { label: "Topics", value: analysis?.topic_count ?? topics.length },
    { label: "Key Concepts", value: analysis?.concept_count ?? 0 },
    { label: "Important Terms", value: analysis?.term_count ?? 0 },
    { label: "Potential Questions", value: analysis?.question_count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-foreground">{material.title}</p>
          <p className="text-xs capitalize text-muted-foreground">{material.kind} · analyzed</p>
        </div>
        <button
          onClick={deleteMaterial}
          disabled={deleting}
          aria-label="Delete material"
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Found
        </h2>
        <Card>
          <CardContent className="grid grid-cols-2 gap-5 p-5">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-extrabold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {topics.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Topics</h2>
          <div className="space-y-2">
            {topics.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  {t.summary && <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>}
                  {t.key_concepts.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.key_concepts.map((c) => (
                        <Badge key={c} tone="accent">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {analysis && analysis.terms.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Important Terms</h2>
          <div className="flex flex-wrap gap-1.5">
            {analysis.terms.map((term) => (
              <Badge key={term} tone="neutral">
                {term}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {analysis && analysis.potential_questions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Potential Questions</h2>
          <div className="space-y-2">
            {analysis.potential_questions.map((q, i) => (
              <Card key={i}>
                <CardContent className="p-3.5 text-sm text-foreground">{q}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">What next</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/app/school/subjects/${subjectId}/plan/new?material=${materialId}`}>
            <Button variant="mission" size="lg" className="w-full">
              <CalendarClock className="h-4 w-4" />
              Create Study Plan
            </Button>
          </Link>
          <Link href={`/app/school/quizzes?subject=${subjectId}&material=${materialId}`}>
            <Button variant="secondary" size="lg" className="w-full">
              <Brain className="h-4 w-4" />
              Generate Quiz
            </Button>
          </Link>
          <Link href={`/app/school/flashcards?subject=${subjectId}&material=${materialId}`}>
            <Button variant="secondary" size="lg" className="w-full">
              <Layers className="h-4 w-4" />
              Make Flashcards
            </Button>
          </Link>
          <Link href={`/app/school/subjects/${subjectId}/session?material=${materialId}`}>
            <Button variant="secondary" size="lg" className="w-full">
              <Play className="h-4 w-4" />
              Start Studying
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
