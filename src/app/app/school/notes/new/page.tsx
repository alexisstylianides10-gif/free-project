"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useStudySubjects } from "@/lib/hooks/study";
import { AddNoteFlow } from "@/components/study/AddNoteFlow";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const EMOJI_CHOICES = ["📘", "🔢", "🔬", "🧪", "📖", "🌍", "💻", "🎨", "🗣️", "📜", "⚗️", "🧬"]; // same list as SubjectsPage

export default function NewNotePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: subjects, loading, refetch } = useStudySubjects(user?.id);

  const [pickedSubjectId, setPickedSubjectId] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [creatingIcon, setCreatingIcon] = useState(EMOJI_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  if (loading) return null; // brief — same as other list screens with no dedicated skeleton

  // Auto-resolve when unambiguous.
  const resolvedSubjectId = pickedSubjectId ?? (subjects.length === 1 ? subjects[0].id : null);

  if (resolvedSubjectId) {
    return (
      <AddNoteFlow
        subjectId={resolvedSubjectId}
        onDone={(materialId) => router.push(`/app/school/subjects/${resolvedSubjectId}/materials/${materialId}`)}
      />
    );
  }

  async function createSubjectAndContinue() {
    if (!user || !supabase || !creatingName.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("study_subjects")
      .insert({ user_id: user.id, name: creatingName.trim(), icon: creatingIcon })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      await refetch();
      setPickedSubjectId(data.id as string);
    }
  }

  if (subjects.length === 0) {
    // Same inline-creation pattern as SubjectsPage's `creating` block, just
    // framed as "what's this note for" instead of a standalone "New Subject"
    // action, since the student's goal right now is the note, not subject
    // management.
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">Quick one before we start — what subject is this note for? You can add more subjects later.</p>
          <input
            autoFocus
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            placeholder="e.g. Biology"
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setCreatingIcon(e)}
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors", creatingIcon === e ? "bg-gradient-brand" : "bg-muted")}
              >
                {e}
              </button>
            ))}
          </div>
          <Button size="md" className="w-full" onClick={createSubjectAndContinue} disabled={!creatingName.trim() || saving}>
            {saving ? "Creating…" : "Continue"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // subjects.length > 1 and none picked yet — same chip-picker visual
  // pattern as Exam Mode's subject picker.
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">Which subject is this note for?</p>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPickedSubjectId(s.id)}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
