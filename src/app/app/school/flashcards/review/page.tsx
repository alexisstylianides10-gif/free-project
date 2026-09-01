"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Minus, PartyPopper } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { gradeFlashcard, logFocusSession } from "@/lib/study/actions";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import { useStudyFlashcards, useStudySubjects } from "@/lib/hooks/study";
import { todayISO, daysBetween } from "@/lib/utils";
import type { FlashcardResult, StudyFlashcard } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const MASTERY_ACHIEVEMENT_THRESHOLD = 20;
const SOON_DAYS = 7;

const BUCKET_LABEL: Record<string, string> = {
  due: "Due Today",
  soon: "Coming Soon",
  mastered: "Mastered",
};

interface GradeResult {
  cardId: string;
  subjectId: string;
  result: FlashcardResult;
}

export default function FlashcardsReviewPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading review…" fullScreen={false} />}>
      <ReviewInner />
    </Suspense>
  );
}

function ReviewInner() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bucket = searchParams.get("bucket");
  const idsParam = searchParams.get("ids");

  const { data: flashcards, loading: flashcardsLoading } = useStudyFlashcards(user?.id);
  const { data: subjects } = useStudySubjects(user?.id);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const today = todayISO();
  const idsList = useMemo(() => (idsParam ? idsParam.split(",").filter(Boolean) : null), [idsParam]);

  const queue = useMemo<StudyFlashcard[]>(() => {
    if (idsList) {
      const byId = new Map(flashcards.map((c) => [c.id, c]));
      return idsList.map((id) => byId.get(id)).filter((c): c is StudyFlashcard => !!c);
    }
    if (bucket === "due") return flashcards.filter((c) => c.due_date <= today);
    if (bucket === "soon")
      return flashcards.filter((c) => {
        const d = daysBetween(today, c.due_date);
        return d > 0 && d <= SOON_DAYS;
      });
    if (bucket === "mastered") return flashcards.filter((c) => c.reps >= 4);
    return [];
  }, [flashcards, idsList, bucket, today]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<GradeResult[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [sessionLogged, setSessionLogged] = useState(false);
  const loggingRef = useRef(false);

  const currentCard = queue[index];
  const complete = !flashcardsLoading && queue.length > 0 && index >= queue.length;

  async function grade(result: FlashcardResult) {
    if (!supabase || !user || !currentCard || grading) return;
    setGrading(true);
    try {
      await gradeFlashcard(supabase, currentCard.id, result);
      setResults((prev) => [...prev, { cardId: currentCard.id, subjectId: currentCard.subject_id, result }]);

      if (result === "knew") {
        const { count } = await supabase
          .from("study_flashcards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("reps", 4);
        if ((count ?? 0) >= MASTERY_ACHIEVEMENT_THRESHOLD) {
          await awardAchievementOnce(supabase, user.id, "flashcards_mastered_20");
        }
      }
    } finally {
      setRevealed(false);
      setIndex((i) => i + 1);
      setGrading(false);
    }
  }

  useEffect(() => {
    if (!complete || sessionLogged || loggingRef.current) return;
    if (!supabase || !user || !profile || results.length === 0) {
      setSessionLogged(true);
      return;
    }
    loggingRef.current = true;

    (async () => {
      const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const bySubject = new Map<string, { total: number; knew: number }>();
      for (const r of results) {
        const g = bySubject.get(r.subjectId) ?? { total: 0, knew: 0 };
        g.total += 1;
        if (r.result === "knew") g.knew += 1;
        bySubject.set(r.subjectId, g);
      }

      let currentProfile: Parameters<typeof logFocusSession>[3] = profile;
      for (const [subjId, stat] of bySubject) {
        const share = Math.max(1, Math.round((stat.total / results.length) * elapsedMin));
        const accuracy = Math.round((stat.knew / stat.total) * 100);
        currentProfile = await logFocusSession(
          supabase!,
          user.id,
          { subjectId: subjId, mode: "review", durationMin: share, accuracyPercent: accuracy },
          currentProfile
        );
      }

      await refreshProfile();
      setSessionLogged(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, sessionLogged]);

  if (flashcardsLoading) {
    return <LoadingScreen message="Loading review…" fullScreen={false} />;
  }

  if (queue.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Nothing to review here</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {bucket && BUCKET_LABEL[bucket]
                ? `You don't have any "${BUCKET_LABEL[bucket]}" cards right now.`
                : "This review session is empty."}
            </p>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full" onClick={() => router.push("/app/school/flashcards")}>
          Back to Flashcards
        </Button>
      </div>
    );
  }

  if (complete) {
    const knewCount = results.filter((r) => r.result === "knew").length;
    const almostCount = results.filter((r) => r.result === "almost").length;
    const didntCount = results.filter((r) => r.result === "didnt").length;
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-accent">
              <PartyPopper className="h-6 w-6" />
            </span>
            <p className="text-lg font-bold text-foreground">Review complete</p>
            <p className="text-sm text-muted-foreground">
              {results.length} card{results.length === 1 ? "" : "s"} reviewed: {knewCount} knew it, {almostCount} almost, {didntCount} didn&rsquo;t know.
            </p>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full" disabled={!sessionLogged} onClick={() => router.push("/app/school/flashcards")}>
          {sessionLogged ? "Done" : "Saving…"}
        </Button>
      </div>
    );
  }

  const subject = subjectMap.get(currentCard.subject_id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        {subject && (
          <span className="flex items-center gap-1">
            {subject.icon} {subject.name}
          </span>
        )}
      </div>
      <ProgressBar value={(index / queue.length) * 100} />

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-card transition-colors hover:border-border-strong"
      >
        {!revealed ? (
          <>
            <p className="text-lg font-semibold leading-relaxed text-foreground">{currentCard.front}</p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tap to reveal answer</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currentCard.front}</p>
            <p className="mt-4 text-xl font-bold leading-relaxed text-accent">{currentCard.back}</p>
          </>
        )}
      </button>

      {revealed && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" disabled={grading} onClick={() => grade("didnt")} className="h-auto flex-col gap-1 px-2 py-3">
            <X className="h-4 w-4" />
            <span className="text-xs">Didn&rsquo;t know</span>
          </Button>
          <Button variant="secondary" disabled={grading} onClick={() => grade("almost")} className="h-auto flex-col gap-1 px-2 py-3">
            <Minus className="h-4 w-4" />
            <span className="text-xs">Almost</span>
          </Button>
          <Button variant="mission" disabled={grading} onClick={() => grade("knew")} className="h-auto flex-col gap-1 px-2 py-3">
            <Check className="h-4 w-4" />
            <span className="text-xs">Knew it</span>
          </Button>
        </div>
      )}
    </div>
  );
}
