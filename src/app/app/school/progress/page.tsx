"use client";

import { useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, Clock, Target, GraduationCap, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStudySubjects, useStudyTopics, useStudyFocusSessions, useStudyQuizAttempts } from "@/lib/hooks/study";
import type { StudyFocusSession, StudyQuizAttempt, StudyTopic } from "@/lib/study/types";
import { addDaysISO, mondayOfThisWeek, formatDayLabel, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";

const MASTERED_CUTOFF = 80;
const IMPROVED_CUTOFF = 60;

interface WeekStats {
  studyTimeMin: number;
  quizAccuracy: number | null;
  topicsMastered: number;
  weakTopicsImproved: number;
}

/** One week's worth of Study Progress numbers, computed from the same raw
 * rows every time — kept in one place so "this week" and "last week" never
 * drift apart by using slightly different filter logic. */
function computeWeekStats(
  sessions: StudyFocusSession[],
  attempts: StudyQuizAttempt[],
  topics: StudyTopic[],
  weekStart: string
): WeekStats {
  const weekEnd = addDaysISO(weekStart, 6);
  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  };

  const weekSessions = sessions.filter((s) => inRange(s.created_at));
  const studyTimeMin = weekSessions.reduce((sum, s) => sum + s.duration_min, 0);

  const weekAttempts = attempts.filter((a) => inRange(a.created_at));
  const quizAccuracy = weekAttempts.length
    ? Math.round(weekAttempts.reduce((sum, a) => sum + a.score_percent, 0) / weekAttempts.length)
    : null;

  // Neither "mastered" nor "improved" has a stored history — approximated
  // honestly using last_practiced_at as the window, since that's the only
  // per-topic timestamp the schema keeps.
  const topicsMastered = topics.filter((t) => t.mastery >= MASTERED_CUTOFF && t.last_practiced_at && inRange(t.last_practiced_at)).length;
  const weakTopicsImproved = topics.filter((t) => t.mastery >= IMPROVED_CUTOFF && t.last_practiced_at && inRange(t.last_practiced_at)).length;

  return { studyTimeMin, quizAccuracy, topicsMastered, weakTopicsImproved };
}

export default function ProgressPage() {
  const { user } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics, loading: topicsLoading } = useStudyTopics(user?.id);
  const { data: sessions, loading: sessionsLoading } = useStudyFocusSessions(user?.id);
  const { data: attempts, loading: attemptsLoading } = useStudyQuizAttempts(user?.id);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const thisWeekStart = mondayOfThisWeek();
  const lastWeekStart = addDaysISO(thisWeekStart, -7);

  const thisWeek = useMemo(() => computeWeekStats(sessions, attempts, topics, thisWeekStart), [sessions, attempts, topics, thisWeekStart]);
  const lastWeek = useMemo(() => computeWeekStats(sessions, attempts, topics, lastWeekStart), [sessions, attempts, topics, lastWeekStart]);

  const history = useMemo(() => {
    const groups: { label: string; sessions: StudyFocusSession[] }[] = [];
    const indexByLabel = new Map<string, number>();
    for (const s of sessions) {
      const label = formatDayLabel(s.created_at.slice(0, 10));
      if (!indexByLabel.has(label)) {
        indexByLabel.set(label, groups.length);
        groups.push({ label, sessions: [] });
      }
      groups[indexByLabel.get(label)!].sessions.push(s);
    }
    return groups;
  }, [sessions]);

  const loading = topicsLoading || sessionsLoading || attemptsLoading;
  if (loading) {
    return <LoadingScreen message="Adding up your progress…" fullScreen={false} />;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">This Week</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={Clock}
            label="Study Time"
            value={`${thisWeek.studyTimeMin}m`}
            delta={deltaLabel(thisWeek.studyTimeMin, lastWeek.studyTimeMin, "m")}
          />
          <StatTile
            icon={Target}
            label="Quiz Accuracy"
            value={thisWeek.quizAccuracy !== null ? `${thisWeek.quizAccuracy}%` : "—"}
            delta={thisWeek.quizAccuracy !== null && lastWeek.quizAccuracy !== null ? deltaLabel(thisWeek.quizAccuracy, lastWeek.quizAccuracy, "%") : null}
          />
          <StatTile
            icon={GraduationCap}
            label="Topics Mastered"
            value={String(thisWeek.topicsMastered)}
            delta={deltaLabel(thisWeek.topicsMastered, lastWeek.topicsMastered, "")}
          />
          <StatTile
            icon={TrendingUp}
            label="Weak Topics Improved"
            value={String(thisWeek.weakTopicsImproved)}
            delta={deltaLabel(thisWeek.weakTopicsImproved, lastWeek.weakTopicsImproved, "")}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Compared with the previous 7 days.</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Study History</h2>
        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No study sessions logged yet"
            subtitle="They'll show up here once you start studying."
          />
        ) : (
          <div className="space-y-4">
            {history.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="space-y-2">
                  {group.sessions.map((s) => {
                    const subject = subjectMap.get(s.subject_id);
                    return (
                      <Card key={s.id}>
                        <CardContent className="flex items-center gap-3 p-3.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-base">
                            {subject?.icon ?? "📘"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{subject?.name ?? "Subject"}</p>
                            <p className="mt-0.5 text-xs capitalize text-muted-foreground">{s.mode}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-foreground">{s.duration_min} min</p>
                            {s.accuracy_percent !== null && <p className="text-xs text-muted-foreground">{s.accuracy_percent}%</p>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function deltaLabel(current: number, previous: number, suffix: string): { text: string; tone: "success" | "danger" | "neutral" } {
  const diff = current - previous;
  if (diff === 0) return { text: `No change`, tone: "neutral" };
  const sign = diff > 0 ? "+" : "";
  return { text: `${sign}${diff}${suffix} vs last week`, tone: diff > 0 ? "success" : "danger" };
}

function StatTile({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  delta: { text: string; tone: "success" | "danger" | "neutral" } | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </p>
        <p className="mt-1 text-xl font-extrabold text-foreground">{value}</p>
        {delta && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-semibold",
              delta.tone === "success" && "text-success",
              delta.tone === "danger" && "text-danger",
              delta.tone === "neutral" && "text-muted-foreground"
            )}
          >
            {delta.tone === "success" && <ArrowUp className="h-3 w-3" />}
            {delta.tone === "danger" && <ArrowDown className="h-3 w-3" />}
            {delta.tone === "neutral" && <Minus className="h-3 w-3" />}
            {delta.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
