"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { MemoryCategory, MemoryItem } from "@/lib/types";
import { formatDayLabel } from "@/lib/utils";

const CATEGORIES: MemoryCategory[] = ["Preferences", "Important dates", "People", "Routines", "Facts"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function MemoryPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const [memories, setMemories] = useState<MemoryItem[] | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("Facts");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authUserId) return;
    db.fetchMemory(authUserId).then(setMemories).catch(() => setMemories([]));
  }, [authUserId]);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!authUserId || !content.trim() || busy) return;
    setBusy(true);
    const created = await db.insertMemoryRow(authUserId, { category, content: content.trim(), reason: "Added manually.", source: "user", active: true });
    setMemories((m) => [created, ...(m ?? [])]);
    setContent("");
    setBusy(false);
  }

  async function remove(id: string) {
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null);
    await db.deleteMemoryRow(id).catch(() => {});
  }

  async function deleteAll() {
    if (!authUserId) return;
    if (!confirm("Delete everything Alxioum remembers about you? This can't be undone.")) return;
    await db.deleteAllMemoryRows(authUserId);
    setMemories([]);
  }

  const active = (memories ?? []).filter((m) => m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Memory</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">What Alxioum remembers about you — fully yours to control.</p>
        </div>
        {active.length > 0 && (
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={deleteAll}>
            <Trash2 className="h-3.5 w-3.5" /> Delete all
          </Button>
        )}
      </div>

      <form onSubmit={addMemory} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input className={`${inputClass} flex-1 min-w-[220px]`} placeholder="Remember that…" value={content} onChange={(e) => setContent(e.target.value)} />
        <select className={`${inputClass} w-44`} value={category} onChange={(e) => setCategory(e.target.value as MemoryCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={!content.trim() || busy}>
          <Plus className="h-4 w-4" /> Save
        </Button>
      </form>

      {memories === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : active.length === 0 ? (
        <EmptyState icon={BrainCircuit} title="Nothing saved yet" body="Add something above, or tell Alxioum in Chat — e.g. 'remember that I prefer morning meetings.'" />
      ) : (
        <div className="space-y-2">
          {active.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="accent">{m.category}</Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDayLabel(m.createdAt.slice(0, 10))}</span>
                    {m.source === "ai" && <span className="text-[11px] text-muted-foreground">· saved by Alxioum</span>}
                  </div>
                  <p className="text-[14px] text-foreground">{m.content}</p>
                  {m.reason && <p className="mt-0.5 text-[12px] text-muted-foreground">{m.reason}</p>}
                </div>
                <button onClick={() => remove(m.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Forget">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
