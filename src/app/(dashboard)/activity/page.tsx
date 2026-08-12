"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarPlus, CalendarClock, CalendarX, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AgentAction {
  id: string;
  tool: string;
  action: string;
  status: "success" | "failed";
  metadata: Record<string, unknown>;
  event_id: string | null;
  created_at: string;
}

const toolIcon: Record<string, typeof CalendarPlus> = {
  "calendar.create_event": CalendarPlus,
  "calendar.update_event": CalendarClock,
  "calendar.delete_event": CalendarX,
};

export default function ActivityPage() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("agent_actions")
        .select("id, tool, action, status, metadata, event_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setActions((data as AgentAction[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="text-[13.5px] text-muted-foreground">Everything Alxioum has done, in order.</p>
      </div>

      {loading ? (
        <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading...</Card>
      ) : actions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          body="When Alxioum creates, updates, or deletes something for you, it'll show up here."
          action={
            <Link href="/app">
              <Button size="sm" variant="outline">
                Ask Alxioum something
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {actions.map((a, i) => {
            const Icon = toolIcon[a.tool] ?? History;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-medium text-foreground">{a.action}</p>
                      <Badge tone={a.status === "success" ? "success" : "danger"}>{a.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {a.tool} · {format(new Date(a.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
