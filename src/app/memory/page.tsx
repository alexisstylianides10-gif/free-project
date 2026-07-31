"use client";

import { useMemo } from "react";
import { BrainCircuit, Info, Trash2 } from "lucide-react";
import { useLifeOS } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { MemoryCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: MemoryCategory[] = [
  "Personal",
  "Preferences",
  "Goals",
  "People",
  "Projects",
  "Important dates",
  "Routines",
  "Past decisions",
];

export default function MemoryPage() {
  const memory = useLifeOS((s) => s.memory);
  const memoryEnabled = useLifeOS((s) => s.profile.memoryEnabled);
  const setMemoryEnabled = useLifeOS((s) => s.setMemoryEnabled);
  const toggleMemory = useLifeOS((s) => s.toggleMemory);
  const deleteMemory = useLifeOS((s) => s.deleteMemory);

  const grouped = useMemo(() => {
    const map = new Map<MemoryCategory, typeof memory>();
    for (const cat of CATEGORIES) map.set(cat, []);
    for (const m of memory) map.get(m.category)?.push(m);
    return map;
  }, [memory]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Memory</h1>
        <p className="text-[13.5px] text-muted-foreground">What LifeOS remembers about you — fully visible, fully editable.</p>
      </div>

      <Card className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-[13.5px] font-semibold text-foreground">LifeOS Memory</p>
          <p className="text-[12.5px] text-muted-foreground">
            When on, LifeOS can remember details you share to give better recommendations. Turn it off any time — nothing is remembered without this being on.
          </p>
        </div>
        <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
      </Card>

      {memory.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="Nothing remembered yet"
          body="As you use LifeOS, things worth remembering — preferences, routines, important dates — will show up here for you to review."
        />
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
                <div className="space-y-2">
                  {items.map((m) => (
                    <Card key={m.id} className={cn("flex items-start justify-between gap-3 p-3.5", !m.active && "opacity-50")}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] text-foreground">{m.content}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge tone="neutral">{m.source}</Badge>
                          <Tooltip label={m.reason}>
                            <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                              <Info className="h-3 w-3" /> Why?
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch checked={m.active} onCheckedChange={() => toggleMemory(m.id)} />
                        <button
                          onClick={() => deleteMemory(m.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                          aria-label="Delete memory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
