# PRODUCT SPECS — WAVE 5

Author: Product. Source: Cato's Wave 5 scope in `PROJECT_STATE.md` (items 14, 15, 17 of the CEO's 17-item report — see "CATO — TRIAGE + PHASED PLAN" section, item-by-item findings and the "Wave 5" plan). Every file referenced below was read in full before writing this spec, including the current state of `study_materials`/`study_topics`/`roadmap_progress`/`user_achievements` in `supabase/schema.sql`, the live `generate-quiz`/`analyze-material` routes, `exam-mode/page.tsx`, `deadlines/page.tsx`, `SchoolSubNav.tsx`, `TopBar.tsx`/`SidebarNav.tsx`/`BottomNav.tsx`, `AchievementToastProvider.tsx`, and `src/lib/actions/roadmap.ts` (the real Wave 4b build, not just its spec) — nothing here is guessed at.

This is a new file, specific to Wave 5. It does not replace `PRODUCT_SPECS.md`, `DEADLINES_SPEC.md`, or `PRODUCT_SPECS_WAVE4.md` — one spec file per initiative, per this project's established precedent.

Ground rules, same as Wave 4:
- No new design tokens or UI primitives beyond what's shipped. Every new UI element below is built from an existing pattern already in this codebase (chip pickers, `.glass` dropdown panels, `ScreenHeader`'s `action` slot, `ProgressBar`/`Badge`/`EmptyState`/`Card`) — none of the three specs invents a new visual language.
- No schema I can avoid. Spec A (Notes) adds zero schema. Spec B (mock exam from a past paper) adds zero schema — it's a new code branch in an existing route. Spec C (notifications) is the one genuinely new table this wave, and it's one table, not three.
- Where an existing interaction pattern already solves part of the problem, I reuse it rather than inventing a parallel one (named per-spec below).

---

## Spec A — "Notes" reframe (Item 15)

### What's actually there today, read directly, not assumed

`src/app/app/school/subjects/[subjectId]/page.tsx` has a "Materials" section (line 136) nested three levels deep: Subjects tab → tap a subject → scroll to "Materials" → tap "Add". The add flow (`src/app/app/school/subjects/[subjectId]/materials/new/page.tsx`) already supports paste-text, typed notes, PDF upload, and photo upload, run through `src/app/api/study/analyze-material/route.ts` (Claude extraction → topics/key-concepts/terms/potential-questions, saved to `study_topics` and rendered on the material detail page under headings "Found," "Topics," "Important Terms," "Potential Questions"). This output framing already reads as "AI-organized notes," not a raw file store — the CEO's original ask ("paste notes / book photos → AI organizes them") is functionally met. **The gap is real but narrow, exactly as Cato found: (a) subject-scoping friction, (b) zero "Notes" labeling anywhere.**

I checked whether the schema forces the subject-scoping: `study_materials.subject_id` and `study_topics.subject_id` are both `not null` (`supabase/schema.sql` lines 349-377), and every other reader of this data — quiz generation's "draw from across this subject's topic list," weak-topics, flashcards-by-subject, `subjectReadiness()` — depends on that FK. Making it nullable to build a genuinely subject-less storage model would ripple into a dozen read sites for a feature Cato already correctly sized as "the smallest of the three, mostly a reframing." That's not proportionate.

### The decision: relabel everywhere (option i) + a genuinely flat nav-level entry point layered on top, with no schema change (a lightweight version of option ii)

Not picking one or the other — the two named gaps need two different fixes, and both are cheap:
- **Gap (b), discoverability**: fixed by relabeling "Materials" → "Notes" in every user-facing string, and by promoting it to its own tab in `SchoolSubNav.tsx` (an 8th tab, same precedent as Homework getting promoted out of `StudentSchoolHome` in Wave 4a).
- **Gap (a), subject-scoping friction**: fixed by making the *entry point* flat — a student can tap "Notes" → "Add Note" without having first navigated into a specific subject — while the underlying row still gets a `subject_id` transparently (auto-picked if unambiguous, chip-picked if not, created inline if the student has none yet). This preserves every existing feature that depends on `subject_id` and costs zero migration risk.

The existing nested add flow (`subjects/[subjectId]/materials/new`) stays working exactly as it does today, for the case where a student is already inside a subject and wants to add a note there directly — this spec doesn't remove that path, it adds a second, flatter one on top.

### 1. Copy-only changes (no logic changes)

- `src/app/app/school/subjects/[subjectId]/page.tsx`: line 136 heading `"Materials"` → `"Notes"`. Line 142 `EmptyState` title `"No material yet"` → `"No notes yet"`.
- `src/app/app/school/subjects/[subjectId]/materials/new/page.tsx`: intro copy `"Add a material and we'll pull out its topics, key concepts, and terms automatically."` → `"Add a note and we'll pull out its topics, key concepts, and terms automatically."` The `SourceTile` currently labeled `"Add Notes"` (the typed-notes option) → rename to `"Type Notes"` — once the section itself is called "Notes," a tile inside it also called "Add Notes" reads as a duplicate/confusing sub-option. `"Paste Text"` stays as-is (already distinct).
- `src/app/app/school/subjects/[subjectId]/materials/[materialId]/page.tsx`: left as-is. `{material.kind} · analyzed` is a low-visibility technical status line, and the delete-confirm copy is fine unchanged — not worth touching for the sake of touching it.

No route renames. `materials/new` and `materials/[materialId]` keep their current URLs — this is copy and one new nav-level entry point, not a URL restructure.

### 2. `SchoolSubNav.tsx` — add the "Notes" tab

```ts
const TABS = [
  { href: "/app/school", label: "Home", match: (p: string) => p === "/app/school" },
  { href: "/app/school/subjects", label: "Subjects", match: (p: string) => p.startsWith("/app/school/subjects") },
  { href: "/app/school/notes", label: "Notes", match: (p: string) => p.startsWith("/app/school/notes") }, // new
  { href: "/app/school/exams", label: "Exams", match: (p: string) => p.startsWith("/app/school/exams") },
  { href: "/app/school/homework", label: "Homework", match: (p: string) => p.startsWith("/app/school/homework") },
  { href: "/app/school/flashcards", label: "Flashcards", match: (p: string) => p.startsWith("/app/school/flashcards") },
  { href: "/app/school/quizzes", label: "Quizzes", match: (p: string) => p.startsWith("/app/school/quizzes") },
  { href: "/app/school/progress", label: "Progress", match: (p: string) => p.startsWith("/app/school/progress") },
];
```

Inserted right after Subjects — this pill row is already horizontally scrollable (`overflow-x-auto`), so an 8th tab is a non-issue, same as when Homework became the 6th→7th.

### 3. New shared component: `src/components/study/AddNoteFlow.tsx`

Extract the entire body of the current `materials/new/page.tsx` (the `SourceTile` grid, the paste/notes textarea mode, the three hidden file inputs, `handleFile`/`handleTextSubmit`/`analyzeAndGo`, all busy/error state) into this component, unchanged in behavior, with this prop interface:

```ts
export function AddNoteFlow({
  subjectId,
  onDone,
}: {
  subjectId: string;
  onDone: (materialId: string) => void;
}) { /* exact existing body, `router.push(...)` calls replaced with onDone(materialId) */ }
```

**This is the one piece of real engineering risk in this spec, flagged explicitly: Dev should diff the extracted component against today's `materials/new/page.tsx` line-by-line to confirm zero behavior drift (same busy/error states, same upload-then-analyze-then-redirect sequence), not just eyeball it.**

`materials/new/page.tsx` becomes a thin wrapper:

```tsx
export default function NewMaterialPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  return (
    <AddNoteFlow
      subjectId={subjectId}
      onDone={(materialId) => router.push(`/app/school/subjects/${subjectId}/materials/${materialId}`)}
    />
  );
}
```

Identical redirect target to today — zero behavior change for the existing nested flow.

### 4. New page: `src/app/app/school/notes/page.tsx` — flat list across every subject

`useStudyMaterials(user?.id)` called with **no** `subjectId` argument — already returns every material for the user across all subjects (confirmed: `useStudyMaterials(userId?, subjectId?)` in `src/lib/hooks/study.ts` only applies the `.eq("subject_id", ...)` filter when `subjectId` is passed; the hook needs zero changes). Also `useStudySubjects(user?.id)` for a `Map<subjectId, StudySubject>` lookup so each row can show its subject's icon/name.

```tsx
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
```

Tapping a note links straight into the existing, unchanged material detail page — no new detail view needed.

### 5. New page: `src/app/app/school/notes/new/page.tsx` — the flat "add" flow's subject resolution step

This is the actual fix for gap (a). Logic:

```tsx
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
```

Net effect: a student with one subject taps "Notes" → "Add Note" and lands straight in the upload/paste screen, zero extra taps versus today's nested flow minus the subject-navigation step. A student with several subjects picks one chip first (one tap). A student with zero subjects (new signup, hasn't made a subject yet) gets a one-field inline prompt instead of being dead-ended — never a dead end, never a forced multi-screen subject-management detour.

### Files touched, Spec A

`src/app/app/school/subjects/[subjectId]/page.tsx` (copy), `src/app/app/school/subjects/[subjectId]/materials/new/page.tsx` (thin wrapper), `src/components/study/AddNoteFlow.tsx` (new, extracted), `src/app/app/school/SchoolSubNav.tsx` (new tab), `src/app/app/school/notes/page.tsx` (new), `src/app/app/school/notes/new/page.tsx` (new).

---

## Spec B — Mock exam grounded in an uploaded past paper (Item 14)

### What's already reusable — checked directly, not assumed

`src/app/app/school/quizzes/exam-mode/page.tsx` already POSTs to `src/app/api/study/generate-quiz/route.ts` with `isMockExam: true`, and that route **already accepts an optional `materialId`** and, when present, grounds the quiz in that material's extracted topics/terms/potential-questions instead of the subject's full curriculum (lines 110-135 of the route). Both the exam-taking UI (`quizzes/[quizId]/page.tsx`, fully generic on `is_mock_exam`/`time_limit_min`) and the entitlement gate (`checkEntitlement`, same call as every other Study AI route, wrapped by `quizzes/layout.tsx`'s `PaywallGate`) need **zero changes** — reusing the exact same route automatically keeps the paywall gating identical, there's no separate gate to keep in sync.

**What's genuinely missing**: the existing `materialId` path only ever sees the *derived* analysis (topic names/summaries/key concepts/terms/a flat list of "potential questions" — never the original document itself, and never framed as "match this paper's actual format"). That's fine for "quiz me on what's in this material" but not what item 14 asks for — a mock exam that mimics a specific past paper's real structure, command words, and difficulty register. That needs the model to actually see the source paper, not just its summary, and needs prompt language that says so explicitly.

### The decision: one new branch in the existing route, not a parallel route or a parallel upload flow

- **Upload/select entry point**: reuse the existing subject-scoped upload flow (`subjects/[subjectId]/materials/new`, or after Spec A, `AddNoteFlow`) — a past paper is just a material like any other (PDF, photo, or pasted text). No new upload UI. Exam Mode's setup page gets a new **"Past paper (optional)"** section: a chip picker over the selected subject's own materials (same visual pattern already used two sections above it for "Linked exam"), restricted to `status === "analyzed"` (can't ground on something still processing or that failed). If the subject has none yet, a plain link to the existing upload page — the exact same precedent Exam Mode's own current empty state already uses ("Add a subject first" → link out, come back after) — no new "return here" plumbing needed.
- **Generation**: extend `generate-quiz/route.ts`'s materialId branch with an enhanced sub-path, used only when `materialId && isMockExam` are both true, that re-downloads the material's actual content (PDF/image bytes, or `raw_text`) and attaches it to the Claude call as a `document`/inline text — the same technique `analyze-material/route.ts` already uses, not a new one — plus a past-paper-specific system-prompt instruction.
- **Taking it**: 100% reused, zero changes — same `study_quizzes` row shape, same `/app/school/quizzes/[quizId]` UI.

### 1. New shared helper: `src/lib/study/materials.ts`

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StudyAIError } from "@/lib/study/ai";
import type { StudyMaterial } from "@/lib/study/types";

/** Downloads a pdf/image material's file from Storage and returns it as a
 * base64 document ready for callStudyAIForJSON's `document` param. Extracted
 * from analyze-material's own download logic (identical behavior) so
 * generate-quiz's past-paper-grounded path can reuse it instead of
 * duplicating the download+base64 code. */
export async function downloadMaterialDocument(
  client: SupabaseClient,
  material: Pick<StudyMaterial, "kind" | "storage_path">
): Promise<{ mediaType: string; base64: string }> {
  if (!material.storage_path) throw new StudyAIError("This material has no file attached.");
  const { data: blob, error } = await client.storage.from("study-materials").download(material.storage_path);
  if (error || !blob) throw new StudyAIError("Couldn't download the uploaded file.");
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const mediaType = material.kind === "pdf" ? "application/pdf" : blob.type || "image/jpeg";
  return { mediaType, base64 };
}
```

Optional, not required this wave: `analyze-material/route.ts` could switch to calling this same helper (its current download logic is identical, verbatim) purely as a dedup. Not doing it as part of this spec — no reason to touch a well-tested, working route just to remove duplication that costs nothing to leave as-is.

### 2. `generate-quiz/route.ts` — the new branch

Inside the existing `else if (materialId)` block, split on `isMockExam`:

```ts
} else if (materialId) {
  const { data: materialRow } = await client.from("study_materials").select("*").eq("id", materialId).maybeSingle();
  if (!materialRow) return NextResponse.json({ error: "Material not found." }, { status: 404 });
  const material = materialRow as StudyMaterial;

  const { data: materialTopics } = await client.from("study_topics").select("*").eq("material_id", materialId);
  const topics = (materialTopics ?? []) as StudyTopic[];
  const analysis = materialRow.analysis as Partial<MaterialAnalysisFull> | null;

  const topicLines = topics.length
    ? topics.map((t) => `- ${t.name}${t.summary ? `: ${t.summary}` : ""}${t.key_concepts.length ? ` (key concepts: ${t.key_concepts.join(", ")})` : ""}`).join("\n")
    : "";
  const termsLine = analysis?.terms?.length ? `Key terms from this material: ${analysis.terms.join(", ")}.` : "";
  const questionsLine = analysis?.potential_questions?.length ? `Sample questions this material could support: ${analysis.potential_questions.join(" | ")}.` : "";

  if (isMockExam) {
    // Past-paper-grounded mock exam: the model needs to see the actual
    // source, not just its derived summary, to mimic real structure/style.
    if (material.status !== "analyzed") {
      return NextResponse.json({ error: "This material hasn't finished analyzing yet." }, { status: 400 });
    }
    if (material.kind === "pdf" || material.kind === "image") {
      pastPaperDocument = await downloadMaterialDocument(client, material);
      contextText =
        `You have been given the actual uploaded past exam paper as an attached document titled "${materialRow.title}". Study it directly.\n` +
        `${topicLines ? `Topics already identified in it:\n${topicLines}\n` : ""}${termsLine}\n${questionsLine}\n`;
    } else {
      contextText =
        `You have been given the actual text of an uploaded past exam paper titled "${materialRow.title}":\n` +
        `--- PAST PAPER START ---\n${(materialRow.raw_text ?? "").trim()}\n--- PAST PAPER END ---\n` +
        `${topicLines ? `Topics already identified in it:\n${topicLines}\n` : ""}${termsLine}\n${questionsLine}\n`;
    }
  } else {
    // Unchanged — regular "quiz me on this material" path.
    contextText =
      `The quiz should draw only on this specific material: "${materialRow.title}".\n` +
      `${topicLines ? `Topics extracted from it:\n${topicLines}\n` : ""}` +
      `${termsLine}\n${questionsLine}\n`;
  }
}
```

`pastPaperDocument` is declared alongside the existing `contextText`/`adaptiveGuidance`/`resolvedTopicId` locals at the top of the try block, typed `DocumentInput | undefined` (import `DocumentInput` from `@/lib/study/ai`), and passed through:

```ts
const ai = await callStudyAIForJSON<AIQuizResponse>({
  system: systemPrompt,
  userText,
  document: pastPaperDocument,
  maxTokens: 4096,
  effort: difficulty === "exam" || isMockExam ? "high" : "medium",
});
```

System prompt gets one additive line, only when both flags are set:

```ts
const pastPaperInstruction =
  materialId && isMockExam
    ? "You have been given a real past exam paper (as an attached document or its transcribed text). Study its actual topics, structure, formatting, question types, and command words (e.g. 'Explain', 'Calculate', 'Describe', 'Evaluate') closely, then write a NEW, original mock exam that could plausibly appear on a similar exam by the same course/exam board — matching this paper's real difficulty, phrasing style, and topic coverage. Do not copy any question verbatim from the source paper; every question must be original. "
    : "";

const systemPrompt =
  `You are an expert study coach writing a quiz for a student studying "${subjectRow.name}". ` +
  `Write exactly ${questionCount} original questions grounded only in the study content provided — never invent facts that aren't implied by it. ` +
  `Difficulty target: ${DIFFICULTY_GUIDANCE[difficulty]} ` +
  `Mix question types across multiple_choice, true_false, short_answer, fill_blank, and scenario — use a genuine variety, not just one type, unless the source content is so thin it only supports one or two types. ` +
  `${isMockExam ? "This is a full mock exam — questions should read like a real exam paper, formally worded, covering breadth across the material. " : ""}` +
  `${pastPaperInstruction}`;
```

Everything else in the route — the `study_quizzes` insert (already stores `material_id`), the JSON parsing/validation, the error handling — is unchanged.

### 3. `exam-mode/page.tsx` — the "Past paper" section

Add `materialId` state and a `useStudyMaterials(user?.id, subjectId)` call (same hook already used elsewhere, just newly used on this page), then a new section between "Linked exam" and "Length":

```tsx
const { data: materials } = useStudyMaterials(user?.id, subjectId);
const analyzedMaterials = materials.filter((m) => m.status === "analyzed");
const [materialId, setMaterialId] = useState("");
```

```tsx
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
        <button type="button" onClick={() => setMaterialId("")} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition-colors", materialId === "" ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground")}>
          None
        </button>
        {analyzedMaterials.map((m) => (
          <button key={m.id} type="button" onClick={() => setMaterialId(m.id)} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition-colors", materialId === m.id ? "bg-gradient-mission text-white shadow-glow-mission" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {m.title}
          </button>
        ))}
      </div>
    )}
    {materialId && <p className="mt-2 text-xs text-muted-foreground">The exam will be grounded in this paper's real topics, format, and difficulty — not just the subject's general curriculum.</p>}
  </div>
)}
```

And `startExam()`'s POST body gets one added field:

```ts
body: JSON.stringify({
  subjectId,
  questionCount: preset.count,
  difficulty,
  isMockExam: true,
  timeLimitMin: preset.timeMin,
  materialId: materialId || undefined, // new
}),
```

Add `import { useStudyMaterials } from "@/lib/hooks/study";` to the existing hooks import.

### Files touched, Spec B

`src/lib/study/materials.ts` (new), `src/app/api/study/generate-quiz/route.ts`, `src/app/app/school/quizzes/exam-mode/page.tsx`.

---

## Spec C — In-app notifications (Item 17)

### Channel decision: in-app only. Confirmed, not assumed.

I independently re-verified the three inputs to this decision rather than taking Cato's summary on faith:
- **Push**: `public/sw.js` has zero `push`/`notificationclick` listeners (cache-only service worker). I also found `supabase/functions/send-notifications/index.ts` — a real-looking Supabase Edge Function with a comment claiming it's "invoked every 15 minutes by a pg_cron job." **This is dead code from an unrelated project**, not real infra: it references `tasks`, `events`, `push_subscriptions`, `profiles.timezone`, `profiles.notification_prefs`, `profiles.last_daily_briefing_sent_at` — none of which exist anywhere in `supabase/schema.sql`, and nothing in `src/` references this function or those tables (grepped, zero hits). Given this repo also has an unrelated `claude/lifeos-redesign-ui-*` branch in its history, this is almost certainly a stray leftover from that project, not Alxioum. **Flagging this explicitly so nobody mistakes it for real push infra** — it should probably be deleted at some point as housekeeping, but that's out of scope for this spec; I did not touch it.
- **Email**: `resend` isn't an npm dependency (checked `package.json`) — Resend today is Supabase Auth's SMTP provider only, configured in the dashboard for OTP/confirmation emails, not something app code can call. Adding arbitrary transactional sends is a real new integration.
- **Precedent**: Deadlines (`src/app/app/deadlines/page.tsx`) already made this exact call — a fully in-app, computed-on-read feature, no email/push.

In-app-only is the right call and I'm not second-guessing it — it also happens to be the only option this codebase can build without adding a new external dependency this project has repeatedly and deliberately avoided.

### What triggers a notification — only things this app already tracks, nothing invented

- **Achievement unlock** (Wave 4a's toast already covers "you're looking at the screen right now"; this is the complement for "you weren't"). Real, single hook point: `awardAchievementOnce()`.
- **Roadmap level advance** (Wave 4b). Real, single hook point: `advanceRoadmapLevel()`.
- **Upcoming exam/homework due dates** (student track) and **business milestone due dates** (business track) — Deadlines already computes these live from `exams`/`homework`/`business_milestones`, no stored table needed for this either.
- **AI Coach thread reply** — checked `src/app/api/coach/route.ts` directly: it's a synchronous POST → immediate Claude response, no async/background reply path exists anywhere. **This trigger does not apply. Not building it** — there is nothing to notify about after the fact, the reply is already in the response the UI is waiting on.

### The generation-mechanism decision — the most important call in this spec

There is no cron/scheduled-job infrastructure anywhere in this project (confirmed: the one thing that looked like it, `send-notifications`, is dead code from a different app, per above). So the mechanism has to fit what's actually here:

- **Achievement unlocks and roadmap advances have a real "moment"** — a specific function call, already reused by every award/advance call site (`awardAchievementOnce`, `advanceRoadmapLevel`). These get a **real row INSERTed into `notifications` at that exact moment**, in the function itself, so every existing call site gets it automatically with zero per-call-site changes.
- **Due-date reminders have no moment** — nothing in this codebase runs periodically to notice "an exam is 2 days away." Storing a row for these would need a background job this project doesn't have. So these are **never stored** — they're computed live, on every read, the exact same way Deadlines already works: a query over `exams`/`homework`/`business_milestones`, filtered to a window, run fresh whenever the notification panel opens. No job, no staleness, no missed cron run possible because there's no cron at all.
- **Dismissing a computed due-date item is a real moment too** (a user's own action, right now) — so dismissal genuinely does write one row, at dismissal time, purely to suppress that item from resurfacing. This is not a background-job pattern; it's the same "write at the moment something happens" rule applied to a user click instead of a system event.

One table, two write patterns, zero jobs.

### 1. Schema — new table

```sql
-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('achievement_unlocked', 'roadmap_level_up', 'deadline_exam', 'deadline_homework', 'deadline_milestone')),
  title text not null,
  body text not null,
  related_id text, -- achievement_key, roadmap level_number (as text), or the source exam/homework/milestone id
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications_all_own" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

One flexible `related_id text` column rather than three nullable typed FK columns for three different source tables — matches "no schema you can avoid." `deadline_exam`/`deadline_homework`/`deadline_milestone` rows are **only ever inserted already-`read: true`, at the moment a student dismisses a live-computed item** — they exist purely as a suppression marker, never as a row that gets rendered as a fresh unread card itself (the live query below explicitly filters them out of the "card" list and only checks their existence). Code comment on the table/type in `src/lib/types.ts` should say this plainly so a future reader doesn't assume `deadline_*` rows are meant to display.

`src/lib/types.ts` addition:

```ts
export type NotificationType = "achievement_unlocked" | "roadmap_level_up" | "deadline_exam" | "deadline_homework" | "deadline_milestone";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_id: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}
```

### 2. New file: `src/lib/notifications.ts` — the live/computed side, mirrors `src/lib/deadlines.ts`'s style

```ts
import { daysBetween } from "@/lib/utils";
import type { Exam, Homework, BusinessMilestone } from "@/lib/types";

export interface NotificationItem {
  id: string; // real notifications.id, or a synthetic `deadline-{source}-{entityId}` for computed items
  type: "achievement_unlocked" | "roadmap_level_up" | "deadline_exam" | "deadline_homework" | "deadline_milestone";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
  dismissible: boolean; // true = computed deadline item (dismiss writes a suppression row); false = stored event row (marks read)
  relatedId?: string;
}

/** Narrower than the full Deadlines page on purpose — Notifications is meant
 * to surface what's actually urgent, not duplicate Deadlines' full list.
 * Window: overdue by up to 3 days, or due within the next 3 days. */
const WINDOW_DAYS = 3;

function inWindow(dueDateISO: string, todayISO: string): boolean {
  const diff = daysBetween(todayISO, dueDateISO);
  return diff >= -WINDOW_DAYS && diff <= WINDOW_DAYS;
}

export function buildDeadlineNotifications(params: {
  exams: Exam[];
  homework: Homework[];
  milestones: BusinessMilestone[];
  isBusiness: boolean;
  dismissedIds: Set<string>; // synthetic ids already suppressed via a stored deadline_* row
  today: string;
}): NotificationItem[] {
  const { exams, homework, milestones, isBusiness, dismissedIds, today } = params;
  const items: NotificationItem[] = [];

  if (isBusiness) {
    for (const m of milestones) {
      if (!m.due_date || m.status === "done" || !inWindow(m.due_date, today)) continue;
      const id = `deadline-milestone-${m.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_milestone", title: m.title, body: `Due ${m.due_date}`, href: "/app/school", read: false, createdAt: today, dismissible: true, relatedId: m.id });
    }
  } else {
    for (const e of exams) {
      if (!inWindow(e.exam_date, today)) continue;
      const id = `deadline-exam-${e.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_exam", title: `${e.subject} Exam`, body: `Due ${e.exam_date}`, href: "/app/school/exams", read: false, createdAt: today, dismissible: true, relatedId: e.id });
    }
    for (const h of homework) {
      if (h.status !== "pending" || !inWindow(h.due_date, today)) continue;
      const id = `deadline-homework-${h.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_homework", title: h.subject, body: h.title, href: "/app/school", read: false, createdAt: today, dismissible: true, relatedId: h.id });
    }
  }
  return items;
}
```

### 3. Hook into the two real event moments

`src/lib/actions/achievements.ts` — insert at the existing idempotent-award point:

```ts
export const ACHIEVEMENT_UNLOCKED_EVENT = "alxioum:achievement-unlocked";

export async function awardAchievementOnce(supabase: SupabaseClient, userId: string, key: string): Promise<boolean> {
  const def = getAchievement(key);
  if (!def) return false;
  const { data } = await supabase
    .from("user_achievements")
    .upsert({ user_id: userId, achievement_key: key }, { onConflict: "user_id,achievement_key", ignoreDuplicates: true })
    .select("achievement_key");
  const newlyAwarded = !!data && data.length > 0;
  if (newlyAwarded) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "achievement_unlocked",
      title: "Achievement unlocked",
      body: def.title,
      related_id: key,
      href: "/app/profile",
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED_EVENT, { detail: { key } }));
    }
  }
  return newlyAwarded;
}
```

(`getAchievement(key)` replaces the current `ACHIEVEMENTS.some(...)` check — same catalog lookup, now also used to read `def.title` for the notification body. This single change covers every existing award call site — `StudentSchoolHome.tsx`, `flashcards/review/page.tsx`, `future/[slug]/page.tsx`, `grade-quiz/route.ts`, `missions.ts`, `xp.ts`, `study/actions.ts` — automatically, both client and server, since `awardAchievementOnce` already runs identically in both contexts today (`grade-quiz/route.ts` already documents that it calls this server-side with no `window`; the notification INSERT doesn't depend on `window`, only the toast CustomEvent does, so server-side award calls still get a real notification row, just no live same-request toast — which is already true today for the toast itself).

`src/lib/actions/roadmap.ts` — insert only when the specifically-requested level (not a silently-backfilled earlier one) is newly completed, so a single action never fires two notifications:

```ts
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";

export const ROADMAP_LEVEL_UP_EVENT = "alxioum:roadmap-level-up";

// ...inside advanceRoadmapLevel, right after the existing
// `if (toComplete.length) { await supabase.from("roadmap_progress").upsert(...) }` block:

if (toComplete.length) {
  await supabase.from("roadmap_progress").upsert(toComplete, { onConflict: "user_id,level_number" });
  if (toComplete.some((r) => r.level_number === level)) {
    const def = ROADMAP_LEVELS.find((l) => l.level === level);
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "roadmap_level_up",
      title: `Roadmap: Level ${level} complete`,
      body: def?.title ?? `You completed level ${level}.`,
      related_id: String(level),
      href: "/app/future",
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ROADMAP_LEVEL_UP_EVENT, { detail: { level } }));
    }
  }
}
```

`href: "/app/future"` is always correct here — the roadmap is student-track-only (Wave 4b's own scope note, unchanged), so this code path only ever runs for student accounts.

### 4. New hook: `src/lib/hooks/useNotifications.ts`

```ts
"use client";
import { supabase } from "@/lib/supabase/client";
import { useTableRows } from "@/lib/hooks/useTableRows";
import type { NotificationRow } from "@/lib/types";

export function useNotifications(userId?: string) {
  const { data, loading, refetch } = useTableRows<NotificationRow>("notifications", userId, {
    orderBy: { column: "created_at", ascending: false },
  });

  async function markRead(id: string) {
    if (!supabase) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    await refetch();
  }

  async function markAllRead(ids: string[]) {
    if (!supabase || ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    await refetch();
  }

  async function dismissDeadline(userIdArg: string, type: NotificationRow["type"], relatedId: string) {
    if (!supabase) return;
    await supabase.from("notifications").insert({ user_id: userIdArg, type, title: "", body: "", related_id: relatedId, read: true });
    await refetch();
  }

  return { data, loading, refetch, markRead, markAllRead, dismissDeadline };
}
```

### 5. New component: `src/components/shared/NotificationBell.tsx`

Reuses the Coach page's own existing toggle-button-reveals-a-`.glass`-panel pattern (`threadPanelOpen` in `src/app/app/coach/page.tsx`) rather than the `Modal` primitive — this is meant to feel like a lightweight dropdown, not a dialog.

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trophy, Compass, CalendarClock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useExams, useHomework, useBusinessMilestones } from "@/lib/hooks/domain";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { buildDeadlineNotifications, type NotificationItem } from "@/lib/notifications";
import { ACHIEVEMENT_UNLOCKED_EVENT } from "@/lib/actions/achievements";
import { ROADMAP_LEVEL_UP_EVENT } from "@/lib/actions/roadmap";
import { todayISO, cn } from "@/lib/utils";

const TYPE_ICON = { achievement_unlocked: Trophy, roadmap_level_up: Compass, deadline_exam: CalendarClock, deadline_homework: CalendarClock, deadline_milestone: CalendarClock };

export function NotificationBell() {
  const { user, profile } = useAuth();
  const isBusiness = profile?.track === "business";
  const [open, setOpen] = useState(false);

  const { data: exams } = useExams(isBusiness ? undefined : user?.id);
  const { data: homework } = useHomework(isBusiness ? undefined : user?.id);
  const { data: milestones } = useBusinessMilestones(isBusiness ? user?.id : undefined);
  const { data: stored, refetch, markRead, markAllRead, dismissDeadline } = useNotifications(user?.id);

  useEffect(() => {
    function onEvent() { refetch(); }
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onEvent);
    window.addEventListener(ROADMAP_LEVEL_UP_EVENT, onEvent);
    return () => {
      window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onEvent);
      window.removeEventListener(ROADMAP_LEVEL_UP_EVENT, onEvent);
    };
  }, [refetch]);

  const dismissedIds = useMemo(
    () => new Set(stored.filter((r) => r.type.startsWith("deadline_")).map((r) => `deadline-${r.type.replace("deadline_", "")}-${r.related_id}`)),
    [stored]
  );

  const items: NotificationItem[] = useMemo(() => {
    const deadlineItems = buildDeadlineNotifications({ exams, homework, milestones, isBusiness, dismissedIds, today: todayISO() });
    const eventItems: NotificationItem[] = stored
      .filter((r) => r.type === "achievement_unlocked" || r.type === "roadmap_level_up")
      .map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, href: r.href ?? "/app", read: r.read, createdAt: r.created_at, dismissible: false }));
    return [...deadlineItems, ...eventItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [stored, exams, homework, milestones, isBusiness, dismissedIds]);

  const unreadCount = items.filter((i) => !i.read).length;

  async function handleItemClick(item: NotificationItem) {
    if (item.dismissible) {
      const [, source, relatedId] = item.id.split("-");
      const type = (`deadline_${source}`) as "deadline_exam" | "deadline_homework" | "deadline_milestone";
      if (user) await dismissDeadline(user.id, type, relatedId);
    } else {
      await markRead(item.id);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    const storedUnreadIds = stored.filter((r) => !r.read && (r.type === "achievement_unlocked" || r.type === "roadmap_level_up")).map((r) => r.id);
    await markAllRead(storedUnreadIds);
    for (const item of items.filter((i) => i.dismissible)) {
      const [, source, relatedId] = item.id.split("-");
      await dismissDeadline(user.id, (`deadline_${source}`) as "deadline_exam" | "deadline_homework" | "deadline_milestone", relatedId);
    }
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 top-11 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl p-2 shadow-raised">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-semibold text-accent">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICON[item.type];
              return (
                <Link key={item.id} href={item.href} onClick={() => handleItemClick(item)} className={cn("flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted", !item.read && "bg-accent-soft/50")}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
```

### 6. Where it lives — desktop is fully covered; mobile has a stated, deliberate gap

**Desktop/tablet (`md:+`): `TopBar.tsx`.** Add `<NotificationBell />` immediately before the theme-toggle button — trivial, no risk, `TopBar` is a normal sticky header (not a fixed overlay), so there's no z-index interaction to worry about with the achievement toast or cookie banner.

**Mobile: no persistent header exists to anchor a global bell.** `TopBar` is deliberately `hidden md:block` by its own existing design (its doc comment: "Mobile keeps its own in-page headers/greetings untouched"), and `BottomNav`'s 5-tab contract shouldn't be broken for a 6th icon. I checked whether a fixed floating bell (FAB-style) would work and ruled it out: `AchievementToastProvider`'s toast is `fixed inset-x-0 top-3`, effectively edge-to-edge at mobile widths (`max-w-sm` inside `px-4` gutters ≈ full width at 390px) — any fixed top-band element would sit directly behind/in front of it during the ~4.5s a toast is showing. Rather than invent new floating chrome to dodge that, **the bell is placed inline in the `action` slot of the existing `ScreenHeader` component** (already used on 8 pages, already has this exact purpose) plus the Home screens' own custom greeting header:

- `src/app/app/StudentHome.tsx` / `src/app/app/BusinessHome.tsx` — add `<NotificationBell />` next to the existing greeting `<h1>` (both tracks' primary landing tab).
- `src/app/app/school/layout.tsx` — `<ScreenHeader title="My School" ... action={<NotificationBell />} />` (covers the whole School tab for students: Subjects, Notes, Exams, Homework, Flashcards, Quizzes, Progress, all nested under this one layout).
- `src/app/app/future/StudentFutureHome.tsx` / `src/app/app/future/BusinessGrowHome.tsx` — both already render `ScreenHeader`; add `action={<NotificationBell />}`.
- `src/app/app/profile/page.tsx` — already renders `ScreenHeader`; add `action={<NotificationBell />}`.

**Stated gap, not silently dropped: on mobile, the bell does not appear on the Coach tab (custom header, no `action` slot today) or the Business track's Plan tab (`BusinessPlanHome.tsx` has no `ScreenHeader` wrapper today).** This means a business-track user on mobile only sees the bell from Home/Grow/Profile, not Plan or Coach — a real, narrower coverage gap than the student track gets. This is an acceptable Wave 5 scope cut, not an oversight: (a) business signups are currently paused per this project's own record, so this gap affects zero net-new users right now; (b) closing it later is a small, mechanical follow-up (add a header to those two pages, drop the same component in) once there's a reason to prioritize it — not a redesign. Desktop/tablet users on either track always get the full-featured bell via `TopBar` regardless of which tab they're on, since `TopBar` is mounted once at the shell level, not per-tab.

### 7. Read status, dismiss, mark-all-read — summarized

- **Event rows** (`achievement_unlocked`, `roadmap_level_up`): `read: false` on insert; tapping the item calls `markRead(id)` (a plain `.update({ read: true })`, RLS-scoped, same pattern as every other own-row update in this codebase).
- **Computed deadline items**: always rendered as unread until dismissed; tapping one inserts a `read: true` suppression row via `dismissDeadline`, after which `buildDeadlineNotifications` filters it out on the next read (its synthetic id is now in `dismissedIds`).
- **Mark all read**: bulk-updates every unread stored event row in one `.in("id", [...])` call, and inserts one dismissal row per currently-visible computed item — both already-idempotent operations, safe to call from a single button.
- **Badge count**: `items.filter(i => !i.read).length` — computed fresh every time `items` recomputes (on mount, on route's data refetch, or on the two CustomEvents), no polling needed for the two real-time triggers since they fire in-session; deadline items are always fresh because they're never cached beyond the current render.

### Files touched, Spec C

`supabase/schema.sql` (new table), `src/lib/types.ts` (new `NotificationRow`/`NotificationType`), `src/lib/notifications.ts` (new), `src/lib/hooks/useNotifications.ts` (new), `src/lib/actions/achievements.ts` (insert + event export), `src/lib/actions/roadmap.ts` (insert + event export), `src/components/shared/NotificationBell.tsx` (new), `src/components/shared/TopBar.tsx`, `src/app/app/StudentHome.tsx`, `src/app/app/BusinessHome.tsx`, `src/app/app/school/layout.tsx`, `src/app/app/future/StudentFutureHome.tsx`, `src/app/app/future/BusinessGrowHome.tsx`, `src/app/app/profile/page.tsx`.

---

## Handoff notes for Dev

All three specs are additive — no existing function signatures change shape in a breaking way, and Spec C's one new table follows the exact `_all_own` RLS convention every other per-user table in this schema already uses.

Build order recommendation, not a hard requirement: **Spec A first** (smallest, self-contained, the `AddNoteFlow` extraction is worth landing and verifying before anything else touches that code path), **then Spec C's schema + achievement/roadmap hooks** (contained, testable in isolation via existing achievement/roadmap flows before any UI is wired up), **then Spec C's UI + Spec B together** (Spec B is independent of Spec C but similar in size).

QA should verify, in addition to the usual `tsc`/`build`/RLS checks:
1. **Spec A**: the extracted `AddNoteFlow` behaves identically to the pre-extraction nested flow (upload each of the 4 source types from both `notes/new` and the still-existing `subjects/[subjectId]/materials/new`); the zero-subjects/one-subject/many-subjects branches of `notes/new` each resolve to the right subject before rendering the upload UI.
2. **Spec B**: a mock exam generated with a past paper selected actually differs in character from one generated without (spot-check that the resulting questions plausibly relate to the uploaded paper's real topics, not just generic subject curriculum); the `status !== "analyzed"` server-side guard rejects a still-processing material even if the client-side filter is somehow bypassed.
3. **Spec C**: an achievement unlock and a roadmap level-up each produce exactly one notification row (not a duplicate one from a backfilled level); a dismissed deadline notification does not reappear on next load; `markAllRead` correctly clears the badge to zero; the mobile coverage gap (Coach, Business Plan tab) is confirmed as the only screens missing the bell, not an unintentional wider gap.
