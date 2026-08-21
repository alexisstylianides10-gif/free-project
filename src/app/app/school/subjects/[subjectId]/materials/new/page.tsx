"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Camera, Image as ImageIcon, NotebookPen, ClipboardPaste, ArrowLeft, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { cn } from "@/lib/utils";
import type { MaterialKind } from "@/lib/study/types";

type TextKind = Extract<MaterialKind, "notes" | "paste">;

function titleFromText(text: string, kind: TextKind): string {
  const firstLine = text.trim().split("\n")[0]?.trim() ?? "";
  if (firstLine.length > 0) return firstLine.slice(0, 70);
  return kind === "paste" ? "Pasted text" : "Notes";
}

export default function NewMaterialPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<"choose" | "text">("choose");
  const [textKind, setTextKind] = useState<TextKind>("notes");
  const [textValue, setTextValue] = useState("");
  const [busy, setBusy] = useState<"saving" | "analyzing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function analyzeAndGo(materialId: string) {
    setBusy("analyzing");
    try {
      await authedFetch("/api/study/analyze-material", {
        method: "POST",
        body: JSON.stringify({ materialId }),
      });
    } catch {
      // The material detail page reads status straight from the DB, so a
      // network hiccup here just means it'll show the "failed" / retry
      // state instead of stalling this screen.
    } finally {
      router.push(`/app/school/subjects/${subjectId}/materials/${materialId}`);
    }
  }

  async function handleFile(file: File, kind: Extract<MaterialKind, "pdf" | "image">) {
    if (!user || !supabase) return;
    setError(null);
    setBusy("saving");
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("study-materials").upload(path, file, {
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("study_materials")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          title: file.name,
          kind,
          storage_path: path,
          status: "pending",
        })
        .select()
        .single();
      if (insertError || !row) throw insertError ?? new Error("Couldn't save that material.");

      await analyzeAndGo(row.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong uploading that file.");
      setBusy(null);
    }
  }

  async function handleTextSubmit() {
    if (!user || !supabase || !textValue.trim() || busy) return;
    setError(null);
    setBusy("saving");
    try {
      const { data: row, error: insertError } = await supabase
        .from("study_materials")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          title: titleFromText(textValue, textKind),
          kind: textKind,
          storage_path: null,
          raw_text: textValue.trim(),
          status: "pending",
        })
        .select()
        .single();
      if (insertError || !row) throw insertError ?? new Error("Couldn't save that material.");

      await analyzeAndGo(row.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong saving that.");
      setBusy(null);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>, kind: Extract<MaterialKind, "pdf" | "image">) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file, kind);
  }

  if (busy === "analyzing") {
    return <LoadingScreen message="Analyzing your material…" fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {mode === "choose" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Add a material and we&apos;ll pull out its topics, key concepts, and terms automatically.
          </p>

          {error && (
            <Card className="border border-danger/40">
              <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <SourceTile
              icon={FileText}
              label="Upload PDF"
              hint="Lecture slides, textbook chapters"
              disabled={!!busy}
              onClick={() => pdfInputRef.current?.click()}
            />
            <SourceTile
              icon={Camera}
              label="Take Photo"
              hint="Snap a page or whiteboard"
              disabled={!!busy}
              onClick={() => cameraInputRef.current?.click()}
            />
            <SourceTile
              icon={ImageIcon}
              label="Upload Image"
              hint="From your camera roll"
              disabled={!!busy}
              onClick={() => imageInputRef.current?.click()}
            />
            <SourceTile
              icon={NotebookPen}
              label="Add Notes"
              hint="Type up what you've got"
              disabled={!!busy}
              onClick={() => {
                setTextKind("notes");
                setTextValue("");
                setError(null);
                setMode("text");
              }}
            />
          </div>

          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              setTextKind("paste");
              setTextValue("");
              setError(null);
              setMode("text");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste Text
          </button>

          {busy === "saving" && <p className="text-center text-xs text-muted-foreground">Saving…</p>}

          <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onPick(e, "pdf")} />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e, "image")}
          />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e, "image")} />
        </>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setMode("choose");
              setError(null);
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h2 className="text-base font-bold text-foreground">{textKind === "paste" ? "Paste Text" : "Add Notes"}</h2>
          <p className="text-sm text-muted-foreground">
            {textKind === "paste"
              ? "Paste in text copied from a textbook, slides, or a document."
              : "Type up what you've got — even rough notes work."}
          </p>

          <textarea
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={textKind === "paste" ? "Paste your text here…" : "Start typing your notes…"}
            rows={12}
            className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            size="lg"
            className="w-full"
            onClick={handleTextSubmit}
            disabled={!textValue.trim() || busy === "saving"}
          >
            {busy === "saving" ? "Saving…" : "Analyze"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SourceTile({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: typeof FileText;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "glass flex flex-col items-start gap-3 rounded-2xl p-4 text-left shadow-card transition-colors",
        "hover:border-accent/40 disabled:opacity-40 disabled:pointer-events-none"
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
