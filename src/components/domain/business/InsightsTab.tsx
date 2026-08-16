"use client";

import { useMemo } from "react";
import { AlertTriangle, Compass, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { BusinessInsight, BusinessInsightKind } from "@/lib/types";

const SECTIONS: { kind: BusinessInsightKind; label: string; icon: typeof AlertTriangle }[] = [
  { kind: "decision", label: "Decisions", icon: ListChecks },
  { kind: "risk", label: "Risks", icon: AlertTriangle },
  { kind: "opportunity", label: "Opportunities", icon: Compass },
];

export function InsightsTab({ businessId }: { businessId: string }) {
  const businessInsights = useAlxioum((s) => s.businessInsights);
  const updateBusinessInsight = useAlxioum((s) => s.updateBusinessInsight);

  const insights = useMemo(() => businessInsights.filter((i) => i.businessId === businessId), [businessInsights, businessId]);

  const hasAny = insights.length > 0;

  return (
    <div className="space-y-6">
      {!hasAny && (
        <p className="text-[12.5px] text-muted-foreground">
          No decisions, risks, or opportunities flagged yet — these show up here as Alxioum notices them while helping you build.
        </p>
      )}
      {SECTIONS.map((section) => {
        const items = insights.filter((i) => i.kind === section.kind);
        if (items.length === 0) return null;
        const Icon = section.icon;
        return (
          <div key={section.kind}>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Icon className="h-4 w-4 text-accent" /> {section.label}
            </p>
            <div className="space-y-2">
              {items.map((i) => (
                <InsightCard key={i.id} insight={i} onUpdate={updateBusinessInsight} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({ insight, onUpdate }: { insight: BusinessInsight; onUpdate: (id: string, patch: Partial<BusinessInsight>) => void }) {
  const resolved = insight.status !== "open";
  return (
    <Card className={resolved ? "opacity-60" : undefined}>
      <CardContent className="p-4">
        <p className="text-[13px] font-medium text-foreground">{insight.title}</p>
        {insight.rationale && <p className="mt-1 text-[12px] text-muted-foreground">{insight.rationale}</p>}
        {insight.evidence && (
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            <span className="font-semibold text-foreground">Evidence: </span>
            {insight.evidence}
          </p>
        )}
        {insight.suggestedAction && (
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            <span className="font-semibold text-foreground">Suggested: </span>
            {insight.suggestedAction}
          </p>
        )}
        {resolved ? (
          <p className="mt-2 text-[11px] font-medium capitalize text-muted-foreground">{insight.status}</p>
        ) : (
          <div className="mt-2.5 flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => onUpdate(insight.id, { status: "accepted" })}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate(insight.id, { status: "ignored" })}>
              Ignore
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
