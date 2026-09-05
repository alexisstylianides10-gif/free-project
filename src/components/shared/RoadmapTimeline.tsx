import { cn } from "@/lib/utils";
import { Lock, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface RoadmapStep {
  level: number;
  title: string;
  description?: string;
  status: "completed" | "unlocked" | "locked";
  /** Only ever set on the single current frontier "unlocked" step whose
   * catalog entry is advancement: "manual" — see StudentFutureHome. */
  action?: { label: string; pending: boolean; onClick: () => void };
}

export function RoadmapTimeline({ steps }: { steps: RoadmapStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => (
        <li key={step.level} className="relative flex gap-4 pb-7 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-[2px]",
                step.status === "locked" ? "bg-border" : "bg-gradient-brand"
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              step.status === "completed" && "bg-gradient-brand text-white",
              step.status === "unlocked" && "border-2 border-accent bg-surface text-accent",
              step.status === "locked" && "bg-muted text-muted-foreground"
            )}
          >
            {step.status === "completed" ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : step.status === "locked" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              step.level
            )}
          </span>
          <div className="pt-0.5">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              Level {step.level}
            </p>
            <p className={cn("text-sm font-semibold", step.status === "locked" ? "text-muted-foreground" : "text-foreground")}>
              {step.title}
            </p>
            {step.description && <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>}
            {step.action && (
              <div className="mt-3">
                <Button size="sm" variant="mission" onClick={step.action.onClick} disabled={step.action.pending}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {step.action.pending ? "Saving…" : step.action.label}
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">Be honest. This one&apos;s on you to confirm.</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
