"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";

export function CompetitorsTab({ businessId }: { businessId: string }) {
  const businessCompetitors = useAlxioum((s) => s.businessCompetitors);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const competitors = useMemo(() => businessCompetitors.filter((c) => c.businessId === businessId), [businessCompetitors, businessId]);

  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [opportunityNote, setOpportunityNote] = useState<string | null>(null);

  async function research() {
    setResearching(true);
    setError(null);
    setUnavailable(false);
    setOpportunityNote(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/business/research-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't research competitors right now.");
      if (!json.available) {
        setUnavailable(true);
      } else {
        setOpportunityNote(json.opportunityNote || null);
        await refreshAll();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't research competitors right now.");
    } finally {
      setResearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={research} disabled={researching} className="w-full justify-center">
        {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {researching ? "Researching…" : "Research Competitors"}
      </Button>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      {unavailable && <p className="text-[12.5px] text-muted-foreground">Research unavailable — couldn&apos;t find reliable information about real competitors for this business.</p>}
      {opportunityNote && (
        <Card className="border-accent/30 bg-accent-soft/30">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Your Opportunity</p>
            <p className="mt-1 text-[12.5px] text-foreground">{opportunityNote}</p>
          </CardContent>
        </Card>
      )}

      {competitors.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No competitor research yet — click above to look for real ones.</p>
      ) : (
        <div className="space-y-2.5">
          {competitors.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-foreground">{c.name}</p>
                  <Badge tone={c.source === "ai_research" ? "accent" : "neutral"}>{c.source === "ai_research" ? "AI research" : "Manual"}</Badge>
                </div>
                {c.product && <p className="mt-1 text-[12.5px] text-muted-foreground">{c.product}</p>}
                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground sm:grid-cols-2">
                  {c.targetCustomer && (
                    <span>
                      Target: <span className="text-foreground">{c.targetCustomer}</span>
                    </span>
                  )}
                  {c.pricing && (
                    <span>
                      Pricing: <span className="text-foreground">{c.pricing}</span>
                    </span>
                  )}
                  {c.strengths && (
                    <span>
                      Strengths: <span className="text-foreground">{c.strengths}</span>
                    </span>
                  )}
                  {c.weaknesses && (
                    <span>
                      Weaknesses: <span className="text-foreground">{c.weaknesses}</span>
                    </span>
                  )}
                </div>
                {c.positioning && <p className="mt-2 text-[11.5px] italic text-muted-foreground">{c.positioning}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
