"use client";

import { useEffect, useState } from "react";
import { History, CheckCircle2, XCircle, CircleSlash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { ActivityEntry } from "@/lib/types";

const toolLabel: Record<string, string> = {
  calendar_create: "Created event",
  calendar_update: "Updated event",
  calendar_delete: "Deleted event",
  tasks_create: "Created task",
  tasks_update: "Updated task",
  tasks_complete: "Completed task",
  tasks_delete: "Deleted task",
  memory_create: "Saved memory",
  memory_delete: "Forgot memory",
};

const statusMeta = {
  SUCCESS: { icon: CheckCircle2, tone: "success" as const },
  FAILED: { icon: XCircle, tone: "danger" as const },
  CANCELLED: { icon: CircleSlash, tone: "neutral" as const },
};

export default function ActivityPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    db.fetchActivity(authUserId).then(setActivity).catch(() => setActivity([]));
  }, [authUserId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Every action Alxioum has taken on your behalf — your audit trail.</p>
      </div>

      {activity === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activity.length === 0 ? (
        <EmptyState icon={History} title="No actions yet" body="Once you confirm an action in Chat, it'll show up here with what happened." />
      ) : (
        <div className="space-y-2">
          {activity.map((a) => {
            const meta = statusMeta[a.status];
            const Icon = meta.icon;
            const summary = typeof a.metadata?.summary === "string" ? (a.metadata.summary as string) : undefined;
            const error = typeof a.metadata?.error === "string" ? (a.metadata.error as string) : undefined;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.status === "SUCCESS" ? "text-success" : a.status === "FAILED" ? "text-danger" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-medium text-foreground">{toolLabel[a.tool] ?? a.tool}</p>
                      <Badge tone={meta.tone}>{a.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    {summary && <p className="mt-1 text-[13px] text-muted-foreground">{summary}</p>}
                    {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
