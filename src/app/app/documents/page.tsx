"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckSquare,
  FileText,
  FolderPlus,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Send,
  Square,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { Modal } from "@/components/ui/Modal";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel } from "@/lib/utils";
import { ALLOWED_TYPES, MAX_SIZE_BYTES } from "@/lib/documents/constants";
import { computeNeedsAttention } from "@/lib/documents/status";
import { computeDocumentInsights } from "@/lib/documents/insights";
import { formatBytes, iconForMimeType, labelForMimeType, PROCESSING_STATUS_META } from "@/lib/documents/ui";
import { Document } from "@/lib/types";

type Section = "recent" | "all" | "starred" | "needsAttention";
type SortKey = "added" | "opened" | "name" | "size" | "category";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "all", label: "All Documents" },
  { key: "starred", label: "Starred" },
  { key: "needsAttention", label: "Needs Attention" },
];

const EXAMPLE_PROMPTS = ["Upload a school assignment", "Upload a travel confirmation", "Upload a receipt", "Upload a PDF"];

interface AskAllAnswer {
  answer: string;
  citedDocuments: { id: string; name: string }[];
  confidence: "grounded" | "uncertain";
}

export default function DocumentsPage() {
  const documents = useAlxioum((s) => s.documents);
  const documentDates = useAlxioum((s) => s.documentDates);
  const documentCollections = useAlxioum((s) => s.documentCollections);
  const uploadDocument = useAlxioum((s) => s.uploadDocument);
  const toggleStarDocument = useAlxioum((s) => s.toggleStarDocument);
  const deleteDocument = useAlxioum((s) => s.deleteDocument);
  const deleteAllDocuments = useAlxioum((s) => s.deleteAllDocuments);
  const addDocumentCollection = useAlxioum((s) => s.addDocumentCollection);
  const setDocumentCollection = useAlxioum((s) => s.setDocumentCollection);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);

  const [section, setSection] = useState<Section>("recent");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const today = useMemo(() => new Date(), []);

  const needsAttentionIds = useMemo(() => new Set(documents.filter((d) => computeNeedsAttention(d, documentDates, today)).map((d) => d.id)), [documents, documentDates, today]);

  const insights = useMemo(() => computeDocumentInsights(documents, documentDates, today), [documents, documentDates, today]);

  const stats = useMemo(() => {
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    return {
      total: documents.length,
      recentlyAdded: documents.filter((d) => new Date(d.createdAt) >= weekAgo).length,
      needsAttention: needsAttentionIds.size,
      storageBytes: documents.reduce((sum, d) => sum + d.sizeBytes, 0),
    };
  }, [documents, needsAttentionIds, today]);

  const categories = useMemo(() => Array.from(new Set(documents.map((d) => d.category).filter((c): c is string => !!c))).sort(), [documents]);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [collectionFilter, setCollectionFilter] = useState<string | "all">("all");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveTarget, setBulkMoveTarget] = useState("");

  const [askQuestion, setAskQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState<AskAllAnswer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const visible = useMemo(() => {
    let list = documents;
    if (section === "starred") list = list.filter((d) => d.starred);
    if (section === "needsAttention") list = list.filter((d) => needsAttentionIds.has(d.id));
    if (categoryFilter !== "all") list = list.filter((d) => d.category === categoryFilter);
    if (collectionFilter !== "all") list = list.filter((d) => d.collectionId === collectionFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((d) => d.name.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));

    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    else if (sort === "category") sorted.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
    else if (sort === "opened") sorted.sort((a, b) => new Date(b.lastOpenedAt ?? 0).getTime() - new Date(a.lastOpenedAt ?? 0).getTime());
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [documents, section, categoryFilter, collectionFilter, query, sort, needsAttentionIds]);

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    const created = await addDocumentCollection(name);
    if (created) setCollectionFilter(created.id);
    setNewCollectionName("");
    setNewCollectionOpen(false);
  }

  async function handleUpload(file: File) {
    setError(null);
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setError("This file type isn't supported yet — try a PDF, DOCX, image, or plain text file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("The document is too large to process (15MB max).");
      return;
    }
    setUploading(true);
    const { document, error: uploadError } = await uploadDocument(file);
    setUploading(false);
    if (uploadError) setError(uploadError);
    else if (document?.processingStatus === "error") setError("Uploaded, but Alxioum couldn't analyze it — you can try again from the document.");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkMoveTarget("");
  }

  function bulkStar() {
    for (const id of selectedIds) {
      const doc = documents.find((d) => d.id === id);
      if (doc && !doc.starred) toggleStarDocument(id);
    }
  }

  function bulkMove() {
    if (!bulkMoveTarget) return;
    for (const id of selectedIds) setDocumentCollection(id, bulkMoveTarget || undefined);
    setBulkMoveTarget("");
  }

  function confirmBulkDelete() {
    for (const id of selectedIds) deleteDocument(id);
    setBulkDeleteOpen(false);
    exitSelectMode();
  }

  async function handleAskAll() {
    const q = askQuestion.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskError(null);
    setAskAnswer(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/documents/ask-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't answer that.");
      setAskAnswer(json as AskAllAnswer);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Couldn't answer that.");
    } finally {
      setAsking(false);
    }
  }

  async function confirmDeleteAll() {
    setDeletingAll(true);
    await deleteAllDocuments();
    setDeletingAll(false);
    setDeleteAllOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Everything important, understood.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event("alxioum:open-command-palette"))}
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted sm:flex"
          >
            <Search className="h-3.5 w-3.5" /> <kbd className="text-[11px]">⌘K</kbd>
          </button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Plus className="h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Documents", value: stats.total },
            { label: "Recently added", value: stats.recentlyAdded },
            { label: "Needs attention", value: stats.needsAttention },
            { label: "Storage", value: formatBytes(stats.storageBytes) },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {insights.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            {insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-2 text-[13px] text-foreground">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <p>{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {documents.length >= 2 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ask across your documents</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAll();
              }}
              className="flex gap-2"
            >
              <input
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                placeholder="e.g. When is my next deadline across all my documents?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <Button type="submit" size="sm" disabled={!askQuestion.trim() || asking}>
                {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </form>
            {askError && <p className="text-[12px] text-danger">{askError}</p>}
            {askAnswer && (
              <div className="rounded-lg bg-muted/50 p-3 text-[13px]">
                <p className="text-foreground">{askAnswer.answer}</p>
                {askAnswer.citedDocuments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {askAnswer.citedDocuments.map((d) => (
                      <Link key={d.id} href={`/app/documents/${d.id}`} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-accent hover:opacity-80">
                        {d.name}
                      </Link>
                    ))}
                  </div>
                )}
                {askAnswer.confidence === "uncertain" && <p className="mt-1.5 text-[11px] text-muted-foreground">Alxioum isn&apos;t fully confident in this answer.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-accent bg-accent-soft" : "border-border"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-[13.5px] text-muted-foreground">Analyzing document…</p>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13.5px] font-medium text-foreground">Drop documents here</p>
            <p className="text-[12px] text-muted-foreground">PDFs, documents, images and more · up to 15MB</p>
            <div className="mt-1.5 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <Button size="sm" variant="secondary" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-3.5 w-3.5" /> Take Photo
              </Button>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Your documents, understood."
          body="Upload a document and Alxioum can summarize it, find important information, and help you act on it."
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              {EXAMPLE_PROMPTS.map((p) => (
                <span key={p} className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    section === s.key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                  {s.key === "needsAttention" && stats.needsAttention > 0 && <span className="ml-1 tabular-nums">({stats.needsAttention})</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                selectMode ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {selectMode ? <X className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
              {selectMode ? "Cancel" : "Select"}
            </button>
          </div>

          {selectMode && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-2 text-[12.5px]">
              <span className="font-medium text-accent">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" onClick={bulkStar}>
                <Star className="h-3.5 w-3.5" /> Star
              </Button>
              {documentCollections.length > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    value={bulkMoveTarget}
                    onChange={(e) => setBulkMoveTarget(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="">Move to…</option>
                    {documentCollections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={bulkMove} disabled={!bulkMoveTarget}>
                    Move
                  </Button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setBulkDeleteOpen(true)} className="text-danger hover:bg-danger-soft">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {documentCollections.length > 0 && (
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="all">All collections</option>
                {documentCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="added">Recently added</option>
              <option value="opened">Recently opened</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="category">Category</option>
            </select>
            {newCollectionOpen ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createCollection();
                    if (e.key === "Escape") setNewCollectionOpen(false);
                  }}
                  placeholder="Collection name"
                  className="w-36 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <Button size="sm" onClick={createCollection} disabled={!newCollectionName.trim()}>
                  Create
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setNewCollectionOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted"
              >
                <FolderPlus className="h-3.5 w-3.5" /> New collection
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No documents match those filters.</p>
          ) : (
            <div className="space-y-2.5">
              {visible.map((doc, i) => (
                <FadeIn key={doc.id} index={i}>
                  <DocumentCard
                    doc={doc}
                    needsAttention={needsAttentionIds.has(doc.id)}
                    onToggleStar={() => toggleStarDocument(doc.id)}
                    onDelete={() => deleteDocument(doc.id)}
                    selectMode={selectMode}
                    selected={selectedIds.has(doc.id)}
                    onToggleSelected={() => toggleSelected(doc.id)}
                  />
                </FadeIn>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Privacy</h2>
              <p className="text-[12.5px] text-muted-foreground">
                Documents you upload are analyzed by Alxioum&apos;s AI to build the summary, dates, tasks, and other information shown here — only the document you upload is sent for
                analysis, nothing else. You can review or remove everything Alxioum has stored at any time.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/app/settings">
                  <Button size="sm" variant="outline">
                    Manage Data
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => setDeleteAllOpen(true)} className="text-danger hover:bg-danger-soft">
                  <Trash2 className="h-3.5 w-3.5" /> Delete All Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Modal open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title={`Delete ${selectedIds.size} document${selectedIds.size === 1 ? "" : "s"}?`} description="This cannot be undone.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmBulkDelete} className="flex-1 justify-center">
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Delete all documents?"
        description={`This permanently deletes all ${documents.length} document${documents.length === 1 ? "" : "s"} and everything Alxioum extracted from them. This cannot be undone.`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeleteAllOpen(false)} className="flex-1 justify-center" disabled={deletingAll}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteAll} className="flex-1 justify-center" disabled={deletingAll}>
            {deletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete All"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function DocumentCard({
  doc,
  needsAttention,
  onToggleStar,
  onDelete,
  selectMode,
  selected,
  onToggleSelected,
}: {
  doc: Document;
  needsAttention: boolean;
  onToggleStar: () => void;
  onDelete: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const Icon = iconForMimeType(doc.mimeType);
  const statusMeta = PROCESSING_STATUS_META[doc.processingStatus];
  const StatusIcon = statusMeta.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {selectMode && (
            <button onClick={onToggleSelected} className="mt-0.5 shrink-0 text-muted-foreground hover:text-accent" aria-label={selected ? "Deselect" : "Select"}>
              {selected ? <Check className="h-4 w-4 rounded border border-accent bg-accent-soft text-accent" /> : <Square className="h-4 w-4" />}
            </button>
          )}
          {selectMode ? (
            <div className="flex min-w-0 flex-1 items-start gap-2.5" onClick={onToggleSelected} role="button">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-foreground">{doc.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted-foreground">
                  <span>{labelForMimeType(doc.mimeType)}</span>
                  <span>·</span>
                  <span>{formatBytes(doc.sizeBytes)}</span>
                  <span>·</span>
                  <span>{formatDayLabel(doc.createdAt.slice(0, 10))}</span>
                </p>
                {doc.summary && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{doc.summary}</p>}
              </div>
            </div>
          ) : (
            <Link href={`/app/documents/${doc.id}`} className="flex min-w-0 flex-1 items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-foreground">{doc.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted-foreground">
                  <span>{labelForMimeType(doc.mimeType)}</span>
                  <span>·</span>
                  <span>{formatBytes(doc.sizeBytes)}</span>
                  <span>·</span>
                  <span>{formatDayLabel(doc.createdAt.slice(0, 10))}</span>
                </p>
                {doc.summary && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{doc.summary}</p>}
              </div>
            </Link>
          )}
          {!selectMode && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button onClick={onToggleStar} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={doc.starred ? "Unstar" : "Star"}>
                <Star className={`h-3.5 w-3.5 ${doc.starred ? "fill-warning text-warning" : ""}`} />
              </button>
              <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={statusMeta.tone}>
            <StatusIcon className={`h-3 w-3 ${statusMeta.spinning ? "animate-spin" : ""}`} /> {statusMeta.label}
          </Badge>
          {needsAttention && doc.processingStatus === "ready" && (
            <Badge tone="warning">
              <span>⚠</span> Needs attention
            </Badge>
          )}
          {doc.category && <Badge tone="neutral">{doc.category}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
