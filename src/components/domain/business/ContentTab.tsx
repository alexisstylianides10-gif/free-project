"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { BusinessContentIdea, BusinessContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const STATUS_TONE: Record<BusinessContentStatus, "neutral" | "accent" | "success"> = {
  idea: "neutral",
  draft: "accent",
  published: "success",
};

export function ContentTab({ businessId }: { businessId: string }) {
  const businessContent = useAlxioum((s) => s.businessContent);
  const addBusinessContent = useAlxioum((s) => s.addBusinessContent);
  const updateBusinessContent = useAlxioum((s) => s.updateBusinessContent);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const content = useMemo(() => businessContent.filter((c) => c.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [businessContent, businessId]);

  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!idea.trim()) return;
    setSaving(true);
    await addBusinessContent({ businessId, idea: idea.trim(), platform: platform.trim() || undefined });
    setIdea("");
    setPlatform("");
    setOpen(false);
    setSaving(false);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/business/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate ideas right now.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate ideas right now.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={generate} disabled={generating} className="flex-1 justify-center">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate Draft Ideas"}
        </Button>
        <Button variant="outline" onClick={() => setOpen((v) => !v)} className="flex-1 justify-center">
          <Plus className="h-3.5 w-3.5" /> Add idea
        </Button>
      </div>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}

      {open && (
        <Card>
          <CardContent className="space-y-2.5 p-5">
            <input className={cn(inputBase, "w-full")} placeholder="Content idea" value={idea} onChange={(e) => setIdea(e.target.value)} />
            <input className={cn(inputBase, "w-full")} placeholder="Platform (optional)" value={platform} onChange={(e) => setPlatform(e.target.value)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 justify-center">
                Cancel
              </Button>
              <Button onClick={save} disabled={!idea.trim() || saving} className="flex-1 justify-center">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {content.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No content ideas yet — generate some grounded in your actual business, or add your own.</p>
      ) : (
        <div className="space-y-2">
          {content.map((c) => (
            <ContentCard key={c.id} item={c} onUpdate={updateBusinessContent} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, onUpdate }: { item: BusinessContentIdea; onUpdate: (id: string, patch: Partial<BusinessContentIdea>) => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground">{item.idea}</p>
          <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
        </div>
        {item.platform && <p className="mt-1 text-[11.5px] text-muted-foreground">{item.platform}</p>}
        {item.status !== "published" && (
          <div className="mt-2.5 flex gap-1.5">
            {item.status === "idea" && (
              <Button size="sm" variant="outline" onClick={() => onUpdate(item.id, { status: "draft" })}>
                Mark as draft
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onUpdate(item.id, { status: "published" })}>
              Mark published
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
