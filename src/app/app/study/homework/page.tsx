"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import { fileToCompressedDataUrl } from "@/lib/image";

interface HomeworkStep {
  title: string;
  guidance: string;
}

interface Walkthrough {
  subject: string;
  problemSummary: string;
  steps: HomeworkStep[];
  finalAnswer: string;
}

export default function HomeworkHelperPage() {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [walkthrough, setWalkthrough] = useState<Walkthrough | null>(null);
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setWalkthrough(null);
    setRevealedSteps(0);
    setShowAnswer(false);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
      const [, base64] = dataUrl.split(",");
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/study/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: { base64, mediaType: "image/jpeg" } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that problem.");
      setWalkthrough(json as Walkthrough);
      setRevealedSteps(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that problem.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPreview(null);
    setWalkthrough(null);
    setRevealedSteps(0);
    setShowAnswer(false);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-muted-foreground">Snap a photo of a homework problem — Alxioum will walk you through solving it, one step at a time, instead of just handing you the answer.</p>

      {!walkthrough && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-muted/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <p className="text-[13.5px] text-muted-foreground">Reading the problem…</p>
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 text-muted-foreground" />
              <p className="text-[13.5px] font-medium text-foreground">Take or upload a photo</p>
              {preview && <p className="text-[12px] text-muted-foreground">Try another photo</p>}
            </>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {preview && !walkthrough && !busy && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Homework problem" className="max-h-64 rounded-xl border border-border object-contain" />
      )}

      {walkthrough && (
        <div className="space-y-3">
          <FadeIn index={0}>
            <Card className="border-accent/20 bg-accent-soft/40">
              <CardContent className="space-y-1 p-4">
                {walkthrough.subject && <p className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">{walkthrough.subject}</p>}
                <p className="text-[13.5px] text-foreground">{walkthrough.problemSummary}</p>
              </CardContent>
            </Card>
          </FadeIn>

          {walkthrough.steps.slice(0, revealedSteps).map((step, i) => (
            <FadeIn key={i} index={i + 1}>
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{step.guidance}</p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}

          {revealedSteps < walkthrough.steps.length ? (
            <Button variant="secondary" onClick={() => setRevealedSteps((n) => n + 1)}>
              <Lightbulb className="h-4 w-4" /> Show next step
            </Button>
          ) : walkthrough.finalAnswer && !showAnswer ? (
            <Button variant="secondary" onClick={() => setShowAnswer(true)}>
              <CheckCircle2 className="h-4 w-4" /> Show final answer
            </Button>
          ) : null}

          {showAnswer && walkthrough.finalAnswer && (
            <FadeIn index={walkthrough.steps.length + 1}>
              <Card className="border-success/30 bg-success-soft/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-[13.5px] text-foreground">{walkthrough.finalAnswer}</p>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          <button onClick={reset} className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> New problem
          </button>
        </div>
      )}
    </div>
  );
}
