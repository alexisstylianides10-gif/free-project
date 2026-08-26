"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, Clock, CalendarDays, Trophy, Sparkles, TriangleAlert, ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { useStudySubjects, useStudyTopics, useStudyMaterials, useStudyFlashcards } from "@/lib/hooks/study";
import { todayISO, daysBetween, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";

const COUNT_OPTIONS = [5, 10, 20] as const;
const MASTERED_REPS = 4;
const SOON_DAYS = 7;

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading flashcards…" fullScreen={false} />}>
      <FlashcardsPageInner />
    </Suspense>
  );
}

function FlashcardsPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get("subject") ?? "";
  const materialParam = searchParams.get("material") ?? "";

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: flashcards, loading: flashcardsLoading, refetch: refetchFlashcards } = useStudyFlashcards(user?.id);

  const [subjectId, setSubjectId] = useState(subjectParam);
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualToggle, setManualToggle] = useState<boolean | null>(null);

  const { data: topics } = useStudyTopics(user?.id, subjectId || undefined);
  const { data: materials } = useStudyMaterials(user?.id, subjectId || undefined);
  const materialInfo = materialParam ? materials.find((m) => m.id === materialParam) : undefined;

  const today = todayISO();

  const cardsForSubjectParam = useMemo(
    () => (subjectParam ? flashcards.filter((c) => c.subject_id === subjectParam) : []),
    [flashcards, subjectParam]
  );

  const buckets = useMemo(() => {
    const due = flashcards.filter((c) => c.due_date <= today);
    const soon = flashcards.filter((c) => {
      const d = daysBetween(today, c.due_date);
      return d > 0 && d <= SOON_DAYS;
    });
    const mastered = flashcards.filter((c) => c.reps >= MASTERED_REPS);
    return { due, soon, mastered };
  }, [flashcards, today]);

  const noCardsAtAll = !flashcardsLoading && flashcards.length === 0;
  const forceGenerate = (!!subjectParam && !flashcardsLoading && cardsForSubjectParam.length === 0) || noCardsAtAll;
  const showGenerate = manualToggle ?? forceGenerate;

  async function generate() {
    if (!subjectId || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await authedFetch("/api/study/generate-flashcards", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          topicId: materialParam ? undefined : topicId || undefined,
          materialId: materialParam || undefined,
          count,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate those flashcards.");
      await refetchFlashcards();
      const ids = (json.cards as { id: string }[]).map((c) => c.id).join(",");
      router.push(`/app/school/flashcards/review?ids=${ids}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong generating those flashcards.");
      setGenerating(false);
    }
  }

  if (generating) {
    return <LoadingScreen message="Writing your flashcards…" fullScreen={false} />;
  }

  return (
    <div className="space-y-8">
      {showGenerate ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Generate Flashcards</h2>
            {!forceGenerate && flashcards.length > 0 && (
              <button
                type="button"
                onClick={() => setManualToggle(false)}
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> My flashcards
              </button>
            )}
          </div>

          {error && (
            <Card className="border border-danger/40">
              <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Add a subject first"
              subtitle="Come back here once you've added a subject to generate flashcards."
              cta={{ label: "Add subject", href: "/app/school/subjects" }}
            />
          ) : (
            <Card>
              <CardContent className="space-y-5 p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSubjectId(s.id);
                          setTopicId("");
                        }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                          subjectId === s.id ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{s.icon}</span>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {subjectId && materialInfo && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                    Generating from <span className="font-semibold text-foreground">&ldquo;{materialInfo.title}&rdquo;</span>
                  </div>
                )}

                {subjectId && !materialInfo && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTopicId("")}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                          topicId === "" ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All topics
                      </button>
                      {topics.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTopicId(t.id)}
                          className={cn(
                            "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                            topicId === t.id ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How many</p>
                  <div className="grid grid-cols-3 gap-2">
                    {COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCount(n)}
                        className={cn(
                          "rounded-xl py-2.5 text-sm font-bold transition-colors",
                          count === n ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <Button size="lg" className="w-full" disabled={!subjectId} onClick={generate}>
                  <Layers className="h-4 w-4" />
                  Generate Flashcards
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">Tap a set below to start reviewing.</p>

            <button type="button" onClick={() => router.push("/app/school/flashcards/review?bucket=due")} className="block w-full text-left" disabled={buckets.due.length === 0}>
              <Card className={cn(buckets.due.length === 0 && "opacity-50")}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Due Today</p>
                    <p className="mt-0.5 text-lg font-extrabold text-foreground">{buckets.due.length} cards</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button type="button" onClick={() => router.push("/app/school/flashcards/review?bucket=soon")} className="block w-full text-left" disabled={buckets.soon.length === 0}>
              <Card className={cn(buckets.soon.length === 0 && "opacity-50")}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-accent">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Coming Soon</p>
                    <p className="mt-0.5 text-lg font-extrabold text-foreground">{buckets.soon.length} cards</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button type="button" onClick={() => router.push("/app/school/flashcards/review?bucket=mastered")} className="block w-full text-left" disabled={buckets.mastered.length === 0}>
              <Card className={cn(buckets.mastered.length === 0 && "opacity-50")}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-success">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mastered</p>
                    <p className="mt-0.5 text-lg font-extrabold text-foreground">{buckets.mastered.length} cards</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          </section>

          <Button variant="secondary" size="lg" className="w-full" onClick={() => setManualToggle(true)}>
            <Sparkles className="h-4 w-4" />
            Generate New Flashcards
          </Button>
        </>
      )}
    </div>
  );
}
