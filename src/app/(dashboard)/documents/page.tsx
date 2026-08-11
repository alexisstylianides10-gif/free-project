"use client";

import { useMemo, useState } from "react";
import { Search, Upload, FolderOpen } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentCard } from "@/components/domain/DocumentCard";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const documents = useAlxioum((s) => s.documents);
  const openQuickAdd = useAlxioum((s) => s.openQuickAdd);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string | null>(null);

  const folders = useMemo(() => [...new Set(documents.map((d) => d.folder))], [documents]);

  const filtered = documents.filter((d) => {
    const matchesQuery =
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
    const matchesFolder = !folder || d.folder === folder;
    return matchesQuery && matchesFolder;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="text-[13.5px] text-muted-foreground">Your personal information library.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openQuickAdd("document")}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="h-full flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          <FolderChip label="All" active={folder === null} onClick={() => setFolder(null)} />
          {folders.map((f) => (
            <FolderChip key={f} label={f} active={folder === f} onClick={() => setFolder(f)} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={documents.length === 0 ? "No documents yet" : "No matches"}
          body={
            documents.length === 0
              ? "Upload a PDF, Word doc, image, or note and Alxioum can summarize it, extract dates, and create reminders."
              : "Try a different search or folder."
          }
          action={
            documents.length === 0 ? (
              <Button size="sm" onClick={() => openQuickAdd("document")}>
                Upload a document
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((d) => (
            <DocumentCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
