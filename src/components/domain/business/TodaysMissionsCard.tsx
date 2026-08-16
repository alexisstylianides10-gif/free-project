"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, MessageCircle, Plus, SkipForward } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { BusinessMission } from "@/lib/types";
import { todayISO, cn } from "@/lib/utils";

export function TodaysMissionsCard({ businessId, onAskAI }: { businessId: string; onAskAI: (mission: BusinessMission) => void }) {
  const businessMissions = useAlxioum((s) => s.businessMissions);
  const addBusinessMission = useAlxioum((s) => s.addBusinessMission);
  const updateBusinessMission = useAlxioum((s) => s.updateBusinessMission);

  const today = todayISO();
  const missions = useMemo(() => businessMissions.filter((m) => m.businessId === businessId && m.missionDate === today), [businessMissions, businessId, today]);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await addBusinessMission({ businessId, title: title.trim(), missionDate: today });
    setTitle("");
    setAdding(false);
    setSaving(false);
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Today&apos;s Missions</p>
          <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {adding && (
          <div className="mb-3 flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="What's today's move?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button size="sm" onClick={save} disabled={!title.trim() || saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </div>
        )}
        {missions.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No mission set for today yet.</p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2">
                <span className={cn("text-[13px]", m.status === "completed" || m.status === "skipped" ? "text-muted-foreground line-through" : "text-foreground")}>{m.title}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {m.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => updateBusinessMission(m.id, { status: "started" })}>
                      Start
                    </Button>
                  )}
                  {m.status !== "completed" && m.status !== "skipped" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateBusinessMission(m.id, { status: "completed", completedAt: new Date().toISOString() })}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateBusinessMission(m.id, { status: "skipped" })}>
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onAskAI(m)}>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
