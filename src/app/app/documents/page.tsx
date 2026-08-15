"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Upload, Trash2, CalendarPlus, ListPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { Document } from "@/lib/types";
import { formatDayLabel } from "@/lib/utils";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "text/markdown"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export default function DocumentsPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authUserId) return;
    db.fetchDocuments(authUserId).then(setDocuments).catch(() => setDocuments([]));
  }, [authUserId]);

  async function upload(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported file type — PDF, image, or plain text only.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("That file is too large (15MB max).");
      return;
    }
    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setDocuments((docs) => [json.document as Document, ...(docs ?? [])]);
      if (json.analysisError) setError("Uploaded, but Alxioum couldn't analyze it just now — you can still open it later.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(doc: Document) {
    const previous = documents;
    setDocuments((docs) => docs?.filter((d) => d.id !== doc.id) ?? null);
    try {
      await db.deleteDocumentRow(doc.id, doc.storagePath);
    } catch {
      setDocuments(previous);
      setError("Couldn't delete that document — try again.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Documents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Upload a PDF, image, or text file — Alxioum will summarize it and pull out any dates.</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-accent-soft" : "border-border hover:bg-muted/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-[13.5px] text-muted-foreground">Analyzing…</p>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13.5px] font-medium text-foreground">Drop a document here, or click to upload</p>
            <p className="text-[12px] text-muted-foreground">PDF, image, or text · up to 15MB</p>
          </>
        )}
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {documents === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" body="Upload one above — Alxioum can then answer questions about it in Chat." />
      ) : (
        <div className="space-y-3">
          {documents.map((doc, i) => (
            <FadeIn key={doc.id} index={i}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{doc.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">{formatDayLabel(doc.createdAt.slice(0, 10))}</p>
                      </div>
                    </div>
                    <button onClick={() => remove(doc)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {doc.summary ? (
                    <p className="text-[13px] text-muted-foreground">{doc.summary}</p>
                  ) : (
                    <p className="text-[13px] italic text-muted-foreground">Analysis pending or unavailable.</p>
                  )}

                  {doc.extractedDates.length > 0 && (
                    <div className="space-y-1.5 border-t border-border pt-3">
                      {doc.extractedDates.map((d, di) => (
                        <div key={di} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                          <span className="text-[12.5px] text-foreground">
                            <span className="font-medium">{d.label}</span> — {formatDayLabel(d.date)}
                          </span>
                          <div className="flex gap-1.5">
                            <Link href={`/app/chat?prefill=${encodeURIComponent(`Create a task for "${d.label}" due ${d.date}, from the document "${doc.name}".`)}`}>
                              <Button size="sm" variant="secondary">
                                <ListPlus className="h-3.5 w-3.5" /> Create task
                              </Button>
                            </Link>
                            <Link href={`/app/chat?prefill=${encodeURIComponent(`Add "${d.label}" to my calendar on ${d.date}, from the document "${doc.name}".`)}`}>
                              <Button size="sm" variant="secondary">
                                <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
