"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Layers, ListChecks, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { FlashcardDeck, StudyQuiz, QuizAttempt } from "@/lib/types";
import { formatDayLabel } from "@/lib/utils";
import { computeWeakTopics } from "@/lib/study/weakTopics";
import { FlashcardDeckView } from "@/components/domain/study/FlashcardDeckView";
import { QuizTakingView } from "@/components/domain/study/QuizTakingView";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

type SourceKind = "note" | "document" | "text";

export default function StudyModePage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const subjects = useAlxioum((s) => s.subjects);

  const [studyNotes, setStudyNotes] = useState<{ id: string; title: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string }[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[] | null>(null);
  const [quizzes, setQuizzes] = useState<StudyQuiz[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const [sourceKind, setSourceKind] = useState<SourceKind>("text");
  const [noteId, setNoteId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [generating, setGenerating] = useState<"flashcards" | "quiz" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openDeckId, setOpenDeckId] = useState<string | null>(null);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    db.fetchStudyNotes(authUserId).then((n) => setStudyNotes(n.map((x) => ({ id: x.id, title: x.title })))).catch(() => setStudyNotes([]));
    db.fetchDocuments(authUserId).then((d) => setDocuments(d.map((x) => ({ id: x.id, name: x.name })))).catch(() => setDocuments([]));
    db.fetchFlashcardDecks(authUserId).then(setDecks).catch(() => setDecks([]));
    db.fetchStudyQuizzes(authUserId).then(setQuizzes).catch(() => setQuizzes([]));
    db.fetchQuizAttempts(authUserId).then(setAttempts).catch(() => setAttempts([]));
  }, [authUserId]);

  const weakTopics = useMemo(() => computeWeakTopics(attempts), [attempts]);
  const quizTitleById = useMemo(() => new Map((quizzes ?? []).map((q) => [q.id, q.title])), [quizzes]);

  function sourceBody() {
    if (sourceKind === "note") return { source: "note" as const, noteId: noteId || undefined };
    if (sourceKind === "document") return { source: "document" as const, documentId: documentId || undefined };
    return { source: "text" as const, text: text.trim() || undefined };
  }

  async function generate(kind: "flashcards" | "quiz") {
    const body = sourceBody();
    if (sourceKind === "note" && !body.noteId) return setError("Pick a note first.");
    if (sourceKind === "document" && !body.documentId) return setError("Pick a document first.");
    if (sourceKind === "text" && !body.text) return setError("Paste some material first.");

    setGenerating(kind);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch(`/api/study/${kind === "flashcards" ? "flashcards" : "quizzes"}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...body, subjectId: subjectId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Couldn't make ${kind}.`);
      if (kind === "flashcards") {
        setDecks((d) => [json.deck as FlashcardDeck, ...(d ?? [])]);
        setOpenDeckId(json.deck.id);
      } else {
        setQuizzes((q) => [json.quiz as StudyQuiz, ...(q ?? [])]);
        setOpenQuizId(json.quiz.id);
      }
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : `Couldn't make ${kind}.`);
    } finally {
      setGenerating(null);
    }
  }

  async function removeDeck(deck: FlashcardDeck) {
    const previous = decks;
    setDecks((d) => d?.filter((x) => x.id !== deck.id) ?? null);
    if (openDeckId === deck.id) setOpenDeckId(null);
    try {
      await db.deleteFlashcardDeckRow(deck.id);
    } catch {
      setDecks(previous);
      setError("Couldn't delete that deck — try again.");
    }
  }

  async function removeQuiz(quiz: StudyQuiz) {
    const previous = quizzes;
    setQuizzes((q) => q?.filter((x) => x.id !== quiz.id) ?? null);
    if (openQuizId === quiz.id) setOpenQuizId(null);
    try {
      await db.deleteStudyQuizRow(quiz.id);
    } catch {
      setQuizzes(previous);
      setError("Couldn't delete that quiz — try again.");
    }
  }

  async function recordAttempt(quiz: StudyQuiz, result: { answers: QuizAttempt["answers"]; score: number; weakTopics: string[] }) {
    if (!authUserId) return;
    try {
      const attempt = await db.insertQuizAttempt(authUserId, { quizId: quiz.id, answers: result.answers, score: result.score, weakTopics: result.weakTopics });
      setAttempts((a) => [attempt, ...a]);
    } catch {
      // Non-critical — the score is already shown to the user even if persisting the attempt fails.
    }
  }

  const openDeck = decks?.find((d) => d.id === openDeckId);
  const openQuiz = quizzes?.find((q) => q.id === openQuizId);

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-muted-foreground">
        Generate flashcards and practice quizzes from your notes, documents, or pasted material — grounded in what you give it, never invented.
      </p>

      <Card>
        <CardContent className="space-y-2.5 p-4">
          <div className="flex flex-wrap gap-1.5">
            {(["text", "note", "document"] as SourceKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setSourceKind(k)}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${sourceKind === k ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {k === "text" ? "Paste material" : k === "note" ? "From a note" : "From a document"}
              </button>
            ))}
          </div>

          {sourceKind === "text" && (
            <textarea className={`${inputClass} min-h-[90px] resize-y`} placeholder="Paste your class notes, textbook excerpt, or syllabus…" value={text} onChange={(e) => setText(e.target.value)} />
          )}
          {sourceKind === "note" && (
            <select className={inputClass} value={noteId} onChange={(e) => setNoteId(e.target.value)}>
              <option value="">Choose a note…</option>
              {studyNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          )}
          {sourceKind === "document" && (
            <select className={inputClass} value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              <option value="">Choose a document…</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {subjects.length > 0 && (
            <select className={`${inputClass} w-full sm:w-52`} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => generate("flashcards")} disabled={generating !== null} className="flex-1 justify-center">
              <Layers className="h-4 w-4" /> {generating === "flashcards" ? "Making flashcards…" : "Make flashcards"}
            </Button>
            <Button onClick={() => generate("quiz")} disabled={generating !== null} className="flex-1 justify-center">
              <Sparkles className="h-4 w-4" /> {generating === "quiz" ? "Making quiz…" : "Make quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {weakTopics.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" /> Weak Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {weakTopics.map((t) => (
              <Badge key={t.topic} tone="warning">
                {t.topic} ({t.wrongCount}/{t.totalCount} wrong)
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Flashcard Decks</p>
        {decks === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : decks.length === 0 ? (
          <EmptyState icon={Layers} title="No decks yet" body="Generate your first deck above." />
        ) : (
          <div className="space-y-2">
            {decks.map((deck) => (
              <Card key={deck.id}>
                <CardContent className="p-4">
                  <button onClick={() => setOpenDeckId((id) => (id === deck.id ? null : deck.id))} className="flex w-full items-center justify-between gap-2 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{deck.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {deck.cards.length} cards · {formatDayLabel(deck.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeDeck(deck); }} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete deck">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                  {openDeck?.id === deck.id && (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <FlashcardDeckView deck={deck} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Quizzes</p>
        {quizzes === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : quizzes.length === 0 ? (
          <EmptyState icon={ListChecks} title="No quizzes yet" body="Generate your first quiz above." />
        ) : (
          <div className="space-y-2">
            {quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardContent className="p-4">
                  <button onClick={() => setOpenQuizId((id) => (id === quiz.id ? null : quiz.id))} className="flex w-full items-center justify-between gap-2 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{quiz.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {quiz.questions.length} questions · {formatDayLabel(quiz.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeQuiz(quiz); }} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete quiz">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                  {openQuiz?.id === quiz.id && (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <QuizTakingView key={quiz.id} quiz={quiz} onComplete={(result) => recordAttempt(quiz, result)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {attempts.length > 0 && quizTitleById.size > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-foreground">Recent Attempts</p>
          <div className="space-y-1.5">
            {attempts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <span className="truncate text-[13px] text-foreground">{quizTitleById.get(a.quizId) ?? "Quiz"}</span>
                <span className="text-[12px] font-medium text-muted-foreground">{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
