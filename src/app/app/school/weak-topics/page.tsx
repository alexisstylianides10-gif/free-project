"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStudySubjects, useStudyTopics } from "@/lib/hooks/study";
import type { StudyTopic } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const NEEDS_ATTENTION_CUTOFF = 75;

function band(mastery: number): { emoji: string; tone: "warning" | "danger" | "success" } {
  if (mastery < 50) return { emoji: "🔴", tone: "danger" };
  if (mastery < 75) return { emoji: "🟠", tone: "warning" };
  return { emoji: "🟢", tone: "success" };
}

/** A short, honest sentence built from the topic's own real attempt
 * numbers — no AI call needed (and no per-topic AI call is appropriate on
 * a list page like this one). */
function topicExplanation(topic: StudyTopic): string {
  if (topic.quiz_attempts === 0) {
    return "Not tested yet, a good next topic to practice.";
  }
  return `You've gotten this right in ${topic.correct_answers} of your last ${topic.quiz_attempts} attempt${topic.quiz_attempts === 1 ? "" : "s"}.`;
}

export default function WeakTopicsPage() {
  const { user } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics, loading } = useStudyTopics(user?.id);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const weakTopics = useMemo(
    () => [...topics].filter((t) => t.mastery < NEEDS_ATTENTION_CUTOFF).sort((a, b) => a.mastery - b.mastery),
    [topics]
  );

  if (loading) {
    return <LoadingScreen message="Finding your weak spots…" fullScreen={false} />;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Every topic under {NEEDS_ATTENTION_CUTOFF}% mastery, across every subject, weakest first.
      </p>

      {weakTopics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CircleCheck className="h-7 w-7 text-success" />
            <p className="text-sm font-semibold text-foreground">No weak topics right now</p>
            <p className="max-w-xs text-sm text-muted-foreground">Everything you&rsquo;ve studied is at {NEEDS_ATTENTION_CUTOFF}% mastery or better.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {weakTopics.map((topic) => {
            const subject = subjectMap.get(topic.subject_id);
            const { emoji, tone } = band(topic.mastery);
            return (
              <Card key={topic.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {subject ? `${subject.icon} ${subject.name}` : "Subject"}
                      </p>
                      <p className="mt-0.5 truncate text-base font-bold text-foreground">
                        {emoji} {topic.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-extrabold text-foreground">{topic.mastery}%</span>
                  </div>

                  <ProgressBar value={topic.mastery} tone={tone === "danger" ? "warning" : tone} className="mt-3" />

                  <p className="mt-3 text-sm text-muted-foreground">{topicExplanation(topic)}</p>

                  <Link href={`/app/school/subjects/${topic.subject_id}/session?topic=${topic.id}`} className="mt-4 block">
                    <Button size="md" className="w-full">
                      Practice Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
