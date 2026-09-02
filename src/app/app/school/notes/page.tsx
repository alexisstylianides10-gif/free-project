"use client";

import Link from "next/link";
import { NotebookPen, FileText } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStudyMaterials, useStudySubjects } from "@/lib/hooks/study";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotesPage() {
  const { user } = useAuth();
  const { data: materials } = useStudyMaterials(user?.id);
  const { data: subjects } = useStudySubjects(user?.id);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Every note, across every subject.</p>
        <Link href="/app/school/notes/new">
          <Button size="sm">Add Note</Button>
        </Link>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          subtitle="Paste text, upload a PDF, or snap a photo — we'll pull out the topics, terms, and practice questions."
          cta={{ label: "Add Note", href: "/app/school/notes/new" }}
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
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{m.status}</span>
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
