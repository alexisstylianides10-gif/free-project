"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, FileText, Loader2, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel } from "@/lib/utils";
import { ALLOWED_TYPES, MAX_SIZE_BYTES } from "@/lib/documents/constants";
import { computeNeedsAttention } from "@/lib/documents/status";
import { formatBytes, iconForMimeType, labelForMimeType, PROCESSING_STATUS_META } from "@/lib/documents/ui";
import { Document } from "@/lib/types";

type Section = "recent" | "all" | "starred" | "needsAttention";
type SortKey = "added" | "name" | "size" | "category";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "all", label: "All Documents" },
  { key: "starred", label: "Starred" },
  { key: "needsAttention", label: "Needs Attention" },
];

const EXAMPLE_PROMPTS = ["Upload a school assignment", "Upload a travel confirmation", "Upload a receipt", "Upload a PDF"];

export default function DocumentsPage() {
  const documents = useAlxioum((s) => s.documents);
  const documentDates = useAlxioum((s) => s.documentDates);
  const uploadDocument = useAlxioum((s) => s.uploadDocument);
  const toggleStarDocument = useAlxioum((s) => s.toggleStarDocument);
  const deleteDocument = useAlxioum((s) => s.deleteDocument);

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

  const visible = useMemo(() => {
    let list = documents;
    if (section === "starred") list = list.filter((d) => d.starred);
    if (section === "needsAttention") list = list.filter((d) => needsAttentionIds.has(d.id));
    if (categoryFilter !== "all") list = list.filter((d) => d.category === categoryFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((d) => d.name.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));

    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    else if (sort === "category") sorted.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [documents, section, categoryFilter, query, sort, needsAttentionIds]);

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
          <div className="flex flex-wrap items-center gap-2">
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
          </div>

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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="added">Recently added</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="category">Category</option>
            </select>
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
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocumentCard({ doc, needsAttention, onToggleStar, onDelete }: { doc: Document; needsAttention: boolean; onToggleStar: () => void; onDelete: () => void }) {
  const Icon = iconForMimeType(doc.mimeType);
  const statusMeta = PROCESSING_STATUS_META[doc.processingStatus];
  const StatusIcon = statusMeta.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
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
          <div className="flex shrink-0 items-center gap-0.5">
            <button onClick={onToggleStar} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={doc.starred ? "Unstar" : "Star"}>
              <Star className={`h-3.5 w-3.5 ${doc.starred ? "fill-warning text-warning" : ""}`} />
            </button>
            <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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
