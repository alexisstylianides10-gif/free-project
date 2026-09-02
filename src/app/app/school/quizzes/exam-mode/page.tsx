"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, TriangleAlert, BookOpen } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { useStudySubjects, useStudyMaterials } from "@/lib/hooks/study";
import { useExams } from "@/lib/hooks/domain";
import type { QuizDifficulty } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const PRESETS = [
  { count: 10, timeMin: 15 },
  { count: 20, timeMin: 30 },
  { count: 30, timeMin: 45 },
] as const;

const DIFFICULTIES: { value: QuizDifficulty; label: string }[] = [
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "exam", label: "Exam Level" },
];

export default function ExamModeSetupPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: exams } = useExams(user?.id);

  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");
  const [materialId, setMaterialId] = useState("");

  const { data: materials } = useStudyMaterials(user?.id, subjectId);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(PRESETS[1]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("exam");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedExams = exams.filter((e) => e.study_subject_id === subjectId);
  const analyzedMaterials = materials.filter((m) => m.status === "analyzed");

  async function startExam() {
    if (!user || !subjectId || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/study/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          questionCount: preset.count,
          difficulty,
          isMockExam: true,
          timeLimitMin: preset.timeMin,
          materialId: materialId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't start the mock exam.");
      router.push(`/app/school/quizzes/${json.quiz.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong starting the mock exam.");
      setStarting(false);
    }
  }

  if (starting) {
    return <LoadingScreen message="Building your mock exam…" fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <Link href="/app/school/quizzes" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-mission text-white">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Exam Mode</h1>
          <p className="text-xs text-muted-foreground">A timed mock exam, no hints until it&apos;s graded.</p>
        </div>
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
          subtitle="Come back here once you've added a subject to start a mock exam."
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
                      setExamId("");
                      setMaterialId("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                      subjectId === s.id ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{s.icon}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {subjectId && linkedExams.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked exam (optional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExamId("")}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                      examId === "" ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    None
                  </button>
                  {linkedExams.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setExamId(e.id)}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                        examId === e.id ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {subjectId && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past paper (optional)</p>
                {analyzedMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No uploaded materials yet for this subject.{" "}
                    <Link href={`/app/school/subjects/${subjectId}/materials/new`} className="font-semibold text-accent">
                      Upload one
                    </Link>
                    , then come back here.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMaterialId("")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                        materialId === "" ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      None
                    </button>
                    {analyzedMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMaterialId(m.id)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                          materialId === m.id ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {m.title}
                      </button>
                    ))}
                  </div>
                )}
                {materialId && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    The exam will be grounded in this paper&apos;s real topics, format, and difficulty — not just the subject&apos;s general curriculum.
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Length</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.count}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={cn(
                      "rounded-xl py-3 text-center transition-colors",
                      preset.count === p.count ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="block text-sm font-bold">{p.count} Qs</span>
                    <span className="block text-caption opacity-80">{p.timeMin} min</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={cn(
                      "rounded-xl py-2.5 text-sm font-bold transition-colors",
                      difficulty === d.value ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="mission" size="lg" className="w-full" disabled={!subjectId} onClick={startExam}>
              Start Mock Exam
            </Button>
            <p className="text-center text-caption leading-relaxed text-muted-foreground">
              Practice-based signal only. A strong mock score is a good sign, not a guarantee for your real exam.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
