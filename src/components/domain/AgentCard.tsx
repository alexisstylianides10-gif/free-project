"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Agent } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { getAgentIcon } from "@/lib/agentIcons";
import { useAlxioum } from "@/lib/store";
import { cn, formatDayLabel } from "@/lib/utils";

export function AgentCard({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false);
  const toggleAgent = useAlxioum((s) => s.toggleAgent);
  const Icon = getAgentIcon(agent.icon);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14.5px] font-semibold text-foreground">{agent.name}</p>
            <Badge tone="neutral">{agent.category}</Badge>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{agent.description}</p>
        </div>
        {agent.installed ? (
          <Switch checked={agent.active} onCheckedChange={() => toggleAgent(agent.id)} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => toggleAgent(agent.id)}>
            Install
          </Button>
        )}
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-[11.5px] font-medium text-muted-foreground hover:bg-muted"
      >
        Details <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-4">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">What it can do</p>
            <ul className="mt-1.5 space-y-1">
              {agent.capabilities.map((c) => (
                <li key={c} className="text-[13px] text-foreground">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {agent.permissions.map((p) => (
                <Badge key={p}>{p}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Connected services</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {agent.connectedServices.map((s) => (
                <Badge key={s} tone="accent">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Run history</p>
            {agent.runHistory.length === 0 ? (
              <p className="mt-1 text-[13px] text-muted-foreground">No runs yet.</p>
            ) : (
              <div className="mt-1.5 space-y-1.5">
                {agent.runHistory.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2 text-[12.5px]">
                    <span className="text-foreground">{r.summary}</span>
                    <span className="shrink-0 text-muted-foreground">{formatDayLabel(r.ranAt.slice(0, 10))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
