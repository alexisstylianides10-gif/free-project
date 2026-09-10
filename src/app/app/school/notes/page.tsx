"use client";

import Link from "next/link";
import { NotebookPen, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStudyMaterials, useStudySubjects } from "@/lib/hooks/study";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotesPage() {
  const { user } = useAuth();
  const t = useTranslations("NotesPage");
  const tStatus = useTranslations("MaterialStatus");
  const { data: materials } = useStudyMaterials(user?.id);
  const { data: subjects } = useStudySubjects(user?.id);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Link href="/app/school/notes/new">
          <Button size="sm">{t("addNote")}</Button>
        </Link>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t("noNotesYet")}
          subtitle={t("noNotesSubtitle")}
          cta={{ label: t("addNote"), href: "/app/school/notes/new" }}
        />
      ) : (
        <div className="space-y-2">
          {materials.map((m) => {
            const subject = subjectById.get(m.subject_id);
            return (
              <Link key={m.id} href={`/app/school/subjects/${m.subject_id}/materials/${m.id}`}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                      {subject && (
                        <p className="truncate text-xs text-muted-foreground">
                          {subject.icon} {subject.name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{tStatus(m.status)}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
