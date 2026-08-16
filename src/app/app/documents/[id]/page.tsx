"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  Check,
  Download,
  Eye,
  FileSearch,
  Landmark,
  Link2,
  ListPlus,
  Loader2,
  MapPin,
  Send,
  Star,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { formatDayLabel } from "@/lib/utils";
import { newId } from "@/lib/utils";
import { formatBytes, iconForMimeType, labelForMimeType, PROCESSING_STATUS_META } from "@/lib/documents/ui";
import { Document, DocumentActivityEntry, DocumentChatMessage } from "@/lib/types";

const ASK_EXAMPLE_PROMPTS = ["When is the deadline?", "What do I need to submit?", "What are the requirements?", "Summarize this for me."];

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params.id;

  const documents = useAlxioum((s) => s.documents);
  const documentDates = useAlxioum((s) => s.documentDates);
  const documentTasks = useAlxioum((s) => s.documentTasks);
  const goals = useAlxioum((s) => s.goals);
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const openDocument = useAlxioum((s) => s.openDocument);
  const toggleStarDocument = useAlxioum((s) => s.toggleStarDocument);
  const deleteDocument = useAlxioum((s) => s.deleteDocument);
  const addEvent = useAlxioum((s) => s.addEvent);
  const addTask = useAlxioum((s) => s.addTask);
  const linkDocumentDateToEvent = useAlxioum((s) => s.linkDocumentDateToEvent);
  const linkDocumentTaskToTask = useAlxioum((s) => s.linkDocumentTaskToTask);
  const setDocumentLinkedGoal = useAlxioum((s) => s.setDocumentLinkedGoal);
  const setDocumentCategory = useAlxioum((s) => s.setDocumentCategory);
  const setDocumentCollection = useAlxioum((s) => s.setDocumentCollection);
  const documentCollections = useAlxioum((s) => s.documentCollections);

  const doc = documents.find((d) => d.id === documentId);
  const dates = useMemo(() => documentDates.filter((d) => d.documentId === documentId).sort((a, b) => a.date.localeCompare(b.date)), [documentDates, documentId]);
  const tasksFound = useMemo(() => documentTasks.filter((t) => t.documentId === documentId), [documentTasks, documentId]);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pageAnchor, setPageAnchor] = useState<number | null>(null);
  const [activity, setActivity] = useState<DocumentActivityEntry[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<DocumentChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [addDatesOpen, setAddDatesOpen] = useState(false);
  const [selectedDateIds, setSelectedDateIds] = useState<Set<string>>(new Set());
  const [addingDates, setAddingDates] = useState(false);
  const [createTasksOpen, setCreateTasksOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [goalSuggestionDismissed, setGoalSuggestionDismissed] = useState(false);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!doc || openedRef.current) return;
    openedRef.current = true;
    openDocument(doc.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  useEffect(() => {
    if (!doc) return;
    db.getDocumentSignedUrl(doc.storagePath)
      .then(setSignedUrl)
      .catch(() => setSignedUrl(null));
  }, [doc]);

  useEffect(() => {
    if (!authUserId || !documentId) return;
    db.fetchDocumentActivity(authUserId, documentId)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [authUserId, documentId]);

  useEffect(() => {
    if (!authUserId || !documentId) return;
    db.fetchDocumentChatMessages(authUserId, documentId)
      .then(setChatMessages)
      .catch(() => setChatMessages([]));
  }, [authUserId, documentId]);

  async function handleAsk(q?: string) {
    const text = (q ?? question).trim();
    if (!text || asking || !doc) return;
    setAsking(true);
    setAskError(null);
    const optimisticUser: DocumentChatMessage = { id: newId(), documentId: doc.id, role: "user", content: text, createdAt: new Date().toISOString() };
    setChatMessages((m) => [...m, optimisticUser]);
    setQuestion("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch(`/api/documents/${doc.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't answer that.");
      const assistantMsg: DocumentChatMessage = {
        id: newId(),
        documentId: doc.id,
        role: "assistant",
        content: json.answer,
        sourcePage: json.sourcePage,
        createdAt: new Date().toISOString(),
      };
      setChatMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Couldn't answer that.");
    } finally {
      setAsking(false);
    }
  }

  function openAddDatesModal() {
    setSelectedDateIds(new Set(dates.filter((d) => !d.addedToCalendarEventId).map((d) => d.id)));
    setAddDatesOpen(true);
  }

  async function confirmAddDates() {
    if (!doc) return;
    setAddingDates(true);
    for (const d of dates.filter((d) => selectedDateIds.has(d.id))) {
      const created = await addEvent({
        title: d.label,
        date: d.date,
        startTime: "09:00",
        endTime: "09:30",
        type: "personal",
        notes: `From document "${doc.name}".`,
        linkedDocumentId: doc.id,
      });
      if (created) linkDocumentDateToEvent(d.id, created.id);
    }
    setAddingDates(false);
    setAddDatesOpen(false);
  }

  function openCreateTasksModal() {
    setSelectedTaskIds(new Set(tasksFound.filter((t) => !t.createdTaskId).map((t) => t.id)));
    setCreateTasksOpen(true);
  }

  async function confirmCreateTasks() {
    if (!doc) return;
    setCreatingTasks(true);
    for (const t of tasksFound.filter((t) => selectedTaskIds.has(t.id))) {
      const created = await addTask({ title: t.title, description: t.description || undefined, category: "personal", documentId: doc.id });
      if (created) linkDocumentTaskToTask(t.id, created.id);
    }
    setCreatingTasks(false);
    setCreateTasksOpen(false);
  }

  // Rule-based, honestly-worded suggestion — keyword overlap between what
  // the document is actually about and an existing goal's name/category.
  // Never auto-connected; always requires an explicit confirm.
  const suggestedGoal = useMemo(() => {
    if (!doc || doc.linkedGoalId || goalSuggestionDismissed) return null;
    const docWords = new Set([...(doc.keyTopics ?? []), doc.category ?? ""].filter(Boolean).map((w) => w.toLowerCase()));
    if (docWords.size === 0) return null;
    return (
      goals.find((g) => {
        if (g.completed) return false;
        const goalWords = `${g.name} ${g.category ?? ""}`.toLowerCase();
        return Array.from(docWords).some((w) => w.length > 3 && goalWords.includes(w));
      }) ?? null
    );
  }, [doc, goals, goalSuggestionDismissed]);

  if (!doc) {
    return (
      <div className="space-y-4">
        <Link href="/app/documents" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Documents
        </Link>
        <p className="text-sm text-muted-foreground">This document couldn&apos;t be found — it may have been deleted.</p>
      </div>
    );
  }

  function handleDelete() {
    if (!doc) return;
    deleteDocument(doc.id);
    router.push("/app/documents");
  }

  const Icon = iconForMimeType(doc.mimeType);
  const statusMeta = PROCESSING_STATUS_META[doc.processingStatus];
  const StatusIcon = statusMeta.icon;

  const hasKeyInfo = doc.documentType || doc.people.length > 0 || doc.organizations.length > 0 || doc.amounts.length > 0 || doc.locations.length > 0 || doc.keyTopics.length > 0;

  return (
    <div className="space-y-5">
      <Link href="/app/documents" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Documents
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
          <div className="min-w-0">
            <h1 className="break-words text-[18px] font-semibold text-foreground">{doc.name}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {labelForMimeType(doc.mimeType)} · {formatBytes(doc.sizeBytes)} · Added {formatDayLabel(doc.createdAt.slice(0, 10))}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <input
                value={doc.category ?? ""}
                onChange={(e) => setDocumentCategory(doc.id, e.target.value || undefined)}
                placeholder={doc.suggestedCategory ? `Category (suggested: ${doc.suggestedCategory})` : "Add a category…"}
                list="document-category-suggestions"
                className="w-44 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {documentCollections.length > 0 && (
                <select
                  value={doc.collectionId ?? ""}
                  onChange={(e) => setDocumentCollection(doc.id, e.target.value || undefined)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">No collection</option>
                  {documentCollections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <datalist id="document-category-suggestions">
              {["School", "Work", "Personal", "Finance", "Travel", "Legal", "Receipts", "Projects", "Other"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => toggleStarDocument(doc.id)}>
            <Star className={`h-3.5 w-3.5 ${doc.starred ? "fill-warning text-warning" : ""}`} /> {doc.starred ? "Starred" : "Star"}
          </Button>
          {signedUrl && (
            <a href={signedUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-danger hover:bg-danger-soft">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <DocumentPreview doc={doc} signedUrl={signedUrl} pageAnchor={pageAnchor} />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <Badge tone={statusMeta.tone}>
                <StatusIcon className={`h-3 w-3 ${statusMeta.spinning ? "animate-spin" : ""}`} /> {statusMeta.label}
              </Badge>

              {doc.processingStatus === "analyzing" && <p className="text-[13px] text-muted-foreground">Alxioum is reading this document — check back in a moment.</p>}
              {doc.processingStatus === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-[13px] text-danger">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{doc.processingError || "Couldn't analyze this document."}</p>
                </div>
              )}

              {doc.processingStatus === "ready" && (
                <>
                  <div>
                    <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
                    <p className="text-[13.5px] text-foreground">{doc.summary || "No summary available."}</p>
                  </div>

                  {hasKeyInfo && (
                    <div>
                      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key Information</h2>
                      <div className="space-y-2 text-[13px]">
                        {doc.documentType && (
                          <div className="flex items-center gap-2 text-foreground">
                            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {doc.documentType}
                          </div>
                        )}
                        {doc.people.length > 0 && (
                          <div className="flex items-start gap-2 text-foreground">
                            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {doc.people.join(", ")}
                          </div>
                        )}
                        {doc.organizations.length > 0 && (
                          <div className="flex items-start gap-2 text-foreground">
                            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {doc.organizations.join(", ")}
                          </div>
                        )}
                        {doc.amounts.length > 0 && (
                          <div className="flex items-start gap-2 text-foreground">
                            <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>
                              {doc.amounts.map((a, i) => (
                                <span key={i} className="mr-3">
                                  {a.label}: {a.value} {a.currency ?? ""}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                        {doc.locations.length > 0 && (
                          <div className="flex items-start gap-2 text-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {doc.locations.join(", ")}
                          </div>
                        )}
                        {doc.keyTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {doc.keyTopics.map((t) => (
                              <Badge key={t} tone="neutral">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {dates.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dates & Deadlines</h2>
                        {dates.some((d) => !d.addedToCalendarEventId) && (
                          <button onClick={openAddDatesModal} className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:opacity-80">
                            <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dates.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[12.5px]">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-foreground">{formatDayLabel(d.date)}</span>
                            <span className="flex-1 text-muted-foreground">— {d.label}</span>
                            {d.addedToCalendarEventId && (
                              <span className="flex shrink-0 items-center gap-1 text-[11px] text-success">
                                <Check className="h-3 w-3" /> Added
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tasksFound.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tasks Found</h2>
                        {tasksFound.some((t) => !t.createdTaskId) && (
                          <button onClick={openCreateTasksModal} className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:opacity-80">
                            <ListPlus className="h-3.5 w-3.5" /> Create Tasks
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {tasksFound.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-foreground">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                              {t.createdTaskId && <Check className="h-3 w-3 text-success" />}
                            </span>
                            <span className="flex-1">{t.title}</span>
                            {t.createdTaskId && <span className="shrink-0 text-[11px] text-success">Task created</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {doc.linkedGoalId && (
            <Card>
              <CardContent className="flex items-center justify-between gap-2 p-4 text-[13px]">
                <div className="flex items-center gap-2 text-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                  Connected to goal &quot;{goals.find((g) => g.id === doc.linkedGoalId)?.name ?? "Untitled goal"}&quot;
                </div>
                <button onClick={() => setDocumentLinkedGoal(doc.id, undefined)} className="shrink-0 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                  Disconnect
                </button>
              </CardContent>
            </Card>
          )}

          {suggestedGoal && (
            <Card>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-start gap-2 text-[13px] text-foreground">
                  <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <p>
                    This document appears relevant to your goal <span className="font-medium">&quot;{suggestedGoal.name}&quot;</span>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setDocumentLinkedGoal(doc.id, suggestedGoal.id)}>
                    Connect to Goal
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGoalSuggestionDismissed(true)}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {doc.processingStatus === "ready" && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ask This Document</h2>

                {chatMessages.length === 0 && !asking && (
                  <div className="flex flex-wrap gap-1.5">
                    {ASK_EXAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleAsk(p)}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {chatMessages.length > 0 && (
                  <div className="max-h-80 space-y-3 overflow-y-auto">
                    {chatMessages.map((m) => (
                      <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                        <div
                          className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-left text-[13px] ${
                            m.role === "user" ? "bg-accent-soft text-accent" : "bg-muted/60 text-foreground"
                          }`}
                        >
                          {m.content}
                        </div>
                        {m.role === "assistant" && m.sourcePage !== undefined && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <FileSearch className="h-3 w-3" />
                            <span>Source: Page {m.sourcePage}</span>
                            <button onClick={() => setPageAnchor(m.sourcePage!)} className="font-medium text-accent hover:opacity-80">
                              Open Page
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {asking && (
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                      </div>
                    )}
                  </div>
                )}

                {askError && <p className="text-[12px] text-danger">{askError}</p>}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAsk();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What do you need to know?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <Button type="submit" size="sm" disabled={!question.trim() || asking}>
                    {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document Activity</h2>
          {activity.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2.5">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 text-[13px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-foreground">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDayLabel(a.createdAt.slice(0, 10))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen} title={`Delete ${doc.name}?`} description="This document and its AI-generated index will be permanently deleted.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1 justify-center">
            Delete
          </Button>
        </div>
      </Modal>

      <Modal open={addDatesOpen} onOpenChange={setAddDatesOpen} title="Add to calendar" description="Review before anything is added — nothing is created until you confirm.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            {dates
              .filter((d) => !d.addedToCalendarEventId)
              .map((d) => (
                <label key={d.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selectedDateIds.has(d.id)}
                    onChange={(e) =>
                      setSelectedDateIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(d.id);
                        else next.delete(d.id);
                        return next;
                      })
                    }
                  />
                  <span className="font-medium text-foreground">{formatDayLabel(d.date)}</span>
                  <span className="text-muted-foreground">— {d.label}</span>
                </label>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddDatesOpen(false)} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button onClick={confirmAddDates} disabled={selectedDateIds.size === 0 || addingDates} className="flex-1 justify-center">
              {addingDates ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${selectedDateIds.size || ""}`.trim()}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={createTasksOpen} onOpenChange={setCreateTasksOpen} title="Create tasks" description="Review before anything is created — nothing is added until you confirm.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            {tasksFound
              .filter((t) => !t.createdTaskId)
              .map((t) => (
                <label key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.has(t.id)}
                    onChange={(e) =>
                      setSelectedTaskIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(t.id);
                        else next.delete(t.id);
                        return next;
                      })
                    }
                  />
                  <span className="text-foreground">{t.title}</span>
                </label>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateTasksOpen(false)} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button onClick={confirmCreateTasks} disabled={selectedTaskIds.size === 0 || creatingTasks} className="flex-1 justify-center">
              {creatingTasks ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${selectedTaskIds.size || ""}`.trim()}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DocumentPreview({ doc, signedUrl, pageAnchor }: { doc: Document; signedUrl: string | null; pageAnchor: number | null }) {
  // Extracted-text and no-preview-available cases don't depend on Storage
  // at all — extractedText is already on the doc row, and the "no preview"
  // message is true regardless. Only PDF/image rendering needs the signed
  // URL to have resolved, so only those two branches show a loading state.
  if (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/")) {
    if (!signedUrl) {
      return (
        <div className="flex h-[50vh] items-center justify-center rounded-xl border border-border bg-surface">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (doc.mimeType === "application/pdf") {
      const pdfSrc = pageAnchor ? `${signedUrl}#page=${pageAnchor}` : signedUrl;
      return (
        <div className="space-y-2">
          <iframe key={pdfSrc} src={pdfSrc} title={doc.name} className="h-[70vh] w-full rounded-xl border border-border bg-surface" />
          <a href={signedUrl} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:opacity-80">
            Open in new tab (if the preview doesn&apos;t load)
          </a>
        </div>
      );
    }
    return (
      <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signedUrl} alt={doc.name} className="max-h-[68vh] w-auto rounded-lg object-contain" />
      </div>
    );
  }

  if (doc.extractedText) {
    return (
      <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-[12.5px] text-foreground">{doc.extractedText}</div>
    );
  }

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-6 text-center">
      <Eye className="h-5 w-5 text-muted-foreground" />
      <p className="text-[13px] font-medium text-foreground">No preview available for this file type</p>
      {signedUrl && (
        <a href={signedUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="mt-1">
            <Download className="h-3.5 w-3.5" /> Download to view
          </Button>
        </a>
      )}
    </div>
  );
}
