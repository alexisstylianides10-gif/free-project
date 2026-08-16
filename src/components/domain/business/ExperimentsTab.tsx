"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { BusinessExperiment, BusinessExperimentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const STATUS_TONE: Record<BusinessExperimentStatus, "neutral" | "accent" | "success"> = {
  planned: "neutral",
  running: "accent",
  completed: "success",
};

export function ExperimentsTab({ businessId }: { businessId: string }) {
  const businessExperiments = useAlxioum((s) => s.businessExperiments);
  const addBusinessExperiment = useAlxioum((s) => s.addBusinessExperiment);
  const updateBusinessExperiment = useAlxioum((s) => s.updateBusinessExperiment);

  const experiments = useMemo(() => businessExperiments.filter((e) => e.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [businessExperiments, businessId]);

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function save() {
    if (!question.trim()) return;
    setSaving(true);
    await addBusinessExperiment({ businessId, question: question.trim(), hypothesis: hypothesis.trim() || undefined, testDescription: testDescription.trim() || undefined });
    setQuestion("");
    setHypothesis("");
    setTestDescription("");
    setOpen(false);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full justify-center">
          <Plus className="h-3.5 w-3.5" /> New experiment
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-2.5 p-5">
            <input className={cn(inputBase, "w-full")} placeholder="Question — what are you testing?" value={question} onChange={(e) => setQuestion(e.target.value)} />
            <input className={cn(inputBase, "w-full")} placeholder="Hypothesis (optional)" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
            <input className={cn(inputBase, "w-full")} placeholder="How will you test it? (optional)" value={testDescription} onChange={(e) => setTestDescription(e.target.value)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 justify-center">
                Cancel
              </Button>
              <Button onClick={save} disabled={!question.trim() || saving} className="flex-1 justify-center">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Start
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {experiments.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No experiments yet.</p>
      ) : (
        <div className="space-y-2">
          {experiments.map((e) => (
            <ExperimentCard key={e.id} experiment={e} expanded={expandedId === e.id} onToggle={() => setExpandedId((id) => (id === e.id ? null : e.id))} onUpdate={updateBusinessExperiment} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentCard({
  experiment,
  expanded,
  onToggle,
  onUpdate,
}: {
  experiment: BusinessExperiment;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, patch: Partial<BusinessExperiment>) => void;
}) {
  const [result, setResult] = useState(experiment.result);
  const [conclusion, setConclusion] = useState(experiment.conclusion);

  return (
    <Card>
      <CardContent className="p-4">
        <button onClick={onToggle} className="flex w-full items-center justify-between gap-2 text-left">
          <span className="text-[13px] font-medium text-foreground">{experiment.question}</span>
          <Badge tone={STATUS_TONE[experiment.status]}>{experiment.status}</Badge>
        </button>
        {expanded && (
          <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3">
            {experiment.hypothesis && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">Hypothesis: </span>
                {experiment.hypothesis}
              </p>
            )}
            {experiment.testDescription && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">Test: </span>
                {experiment.testDescription}
              </p>
            )}
            <textarea
              className={cn(inputBase, "min-h-[50px] w-full resize-none")}
              placeholder="Result — what actually happened?"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
            <textarea
              className={cn(inputBase, "min-h-[50px] w-full resize-none")}
              placeholder="Conclusion — was the hypothesis validated?"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {(["planned", "running", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate(experiment.id, { status: s })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11.5px] font-medium capitalize",
                    experiment.status === s ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => onUpdate(experiment.id, { result, conclusion })} className="w-full justify-center">
              Save result
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
