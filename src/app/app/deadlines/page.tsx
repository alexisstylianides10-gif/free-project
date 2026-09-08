"use client";

import Link from "next/link";
import { CalendarClock, ClipboardList, Target, CalendarCheck2, TriangleAlert, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework, useExams, useBusinessMilestones } from "@/lib/hooks/domain";
import { formatCountdown, todayISO, daysBetween } from "@/lib/utils";
import { groupDeadlines, badgeToneForBucket, type DeadlineItem, type DeadlineSource } from "@/lib/deadlines";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const SOURCE_ICON: Record<DeadlineSource, LucideIcon> = {
  exam: CalendarClock,
  homework: ClipboardList,
  milestone: Target,
};

export default function DeadlinesPage() {
  const { user, profile } = useAuth();
  const isBusiness = profile?.track === "business";
  const today = todayISO();
  const t = useTranslations("DeadlinesPage");
  const SOURCE_LABEL: Record<DeadlineSource, string> = {
    exam: t("source.exam"),
    homework: t("source.homework"),
    milestone: t("source.milestone"),
  };
  const BUCKET_LABEL: Record<string, string> = {
    overdue: t("bucket.overdue"),
    today: t("bucket.today"),
    "this-week": t("bucket.thisWeek"),
    later: t("bucket.later"),
  };

  const { data: exams, loading: examsLoading, error: examsError } = useExams(isBusiness ? undefined : user?.id);
  const { data: homework, loading: homeworkLoading, error: homeworkError } = useHomework(isBusiness ? undefined : user?.id);
  const { data: milestones, loading: milestonesLoading, error: milestonesError } = useBusinessMilestones(isBusiness ? user?.id : undefined);

  const loading = isBusiness ? milestonesLoading : examsLoading || homeworkLoading;
  const error = isBusiness ? milestonesError : examsError ?? homeworkError;

  const items: DeadlineItem[] = useMemo(() => {
    if (isBusiness) {
      return milestones
        .filter((m) => m.due_date != null && m.status !== "done")
        .map((m) => ({
          id: m.id,
          source: "milestone" as const,
          title: m.title,
          subtitle: m.description ?? undefined,
          dueDate: m.due_date as string,
          href: "/app/school",
        }));
    }
    return [
      ...exams
        .filter((e) => daysBetween(today, e.exam_date) >= 0)
        .map((e) => ({
          id: e.id,
          source: "exam" as const,
          title: t("subjectExam", { subject: e.subject }),
          subtitle: e.title !== e.subject ? e.title : undefined,
          dueDate: e.exam_date,
          href: "/app/school/exams",
        })),
      ...homework
        .filter((h) => h.status === "pending")
        .map((h) => ({
          id: h.id,
          source: "homework" as const,
          title: h.subject,
          subtitle: h.title,
          dueDate: h.due_date,
          href: "/app/school",
        })),
    ];
  }, [isBusiness, exams, homework, milestones, today]);

  const groups = useMemo(() => groupDeadlines(items), [items]);
  const hasAnySourceData = isBusiness ? milestones.length > 0 : exams.length > 0 || homework.length > 0;

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader title={t("title")} subtitle={t("subtitle")} />

      {error && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("loadError", { error })}</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingScreen message={t("gathering")} fullScreen={false} />
      ) : groups.length === 0 ? (
        isBusiness ? (
          hasAnySourceData ? (
            <EmptyState
              icon={CalendarCheck2}
              title={t("noMilestonesWithDueDate")}
              subtitle={t("noMilestonesWithDueDateSubtitle")}
              cta={{ label: t("goToPlan"), href: "/app/school" }}
            />
          ) : (
            <EmptyState
              icon={Target}
              title={t("noMilestonesYet")}
              subtitle={t("noMilestonesYetSubtitle")}
              cta={{ label: t("goToPlan"), href: "/app/school" }}
            />
          )
        ) : (
          <EmptyState
            icon={CalendarCheck2}
            title={t("nothingDue")}
            subtitle={t("nothingDueSubtitle")}
            cta={{ label: t("goToSchool"), href: "/app/school" }}
          />
        )
      ) : (
        groups.map((group) => (
          <section key={group.bucket}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{BUCKET_LABEL[group.bucket]}</h2>
              <span className="text-xs font-semibold text-muted-foreground">{group.items.length}</span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const SourceIcon = SOURCE_ICON[item.source];
                return (
                  <Link href={item.href} key={`${item.source}-${item.id}`} className="block">
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <SourceIcon className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                          {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone="neutral">{SOURCE_LABEL[item.source]}</Badge>
                          <Badge tone={badgeToneForBucket(group.bucket)}>{formatCountdown(item.dueDate)}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
