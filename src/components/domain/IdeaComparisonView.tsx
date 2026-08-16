"use client";

import { Button } from "@/components/ui/Button";
import { IdeaCandidate } from "@/lib/business/ideas";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function IdeaComparisonView({
  ideas,
  recommendedIndex,
  recommendationNote,
  onChoose,
}: {
  ideas: IdeaCandidate[];
  recommendedIndex: number | null;
  recommendationNote?: string;
  onChoose: (idea: IdeaCandidate) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea, i) => (
          <div
            key={idea.name}
            className={cn("flex flex-col gap-2.5 rounded-xl border p-3.5", i === recommendedIndex ? "border-accent bg-accent-soft/40" : "border-border bg-background")}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-foreground">{idea.name}</p>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{idea.score.overall}/100</span>
            </div>
            <p className="text-[12px] leading-snug text-muted-foreground">{idea.problem}</p>
            <div className="space-y-1.5">
              <ScoreBar label="Demand" value={idea.score.demand} />
              <ScoreBar label="Competition" value={idea.score.competition} />
              <ScoreBar label="Difficulty" value={idea.score.difficulty} />
              <ScoreBar label="Monetization" value={idea.score.monetization} />
              <ScoreBar label="User fit" value={idea.score.userFit} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Startup cost: <b className="font-semibold text-foreground">{idea.startupCost}</b>
              </span>
              <span>
                Competition: <b className="font-semibold capitalize text-foreground">{idea.competitionLevel}</b>
              </span>
            </div>
            <Button size="sm" onClick={() => onChoose(idea)} className="mt-1 w-full justify-center">
              Build this
            </Button>
          </div>
        ))}
      </div>
      {recommendationNote && <p className="text-[12.5px] text-muted-foreground">{recommendationNote}</p>}
      <p className="text-[11px] text-muted-foreground/80">AI estimate based on the information available — not a guarantee of success.</p>
    </div>
  );
}
