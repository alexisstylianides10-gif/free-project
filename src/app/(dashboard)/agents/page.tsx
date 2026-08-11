"use client";

import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { AgentCard } from "@/components/domain/AgentCard";
import { AgentCategory } from "@/lib/types";

const CATEGORIES: AgentCategory[] = ["Productivity", "Finance", "School", "Travel", "Communication", "Shopping", "Business", "Personal"];

export default function AgentsPage() {
  const agents = useAlxioum((s) => s.agents);
  const [tab, setTab] = useState("mine");
  const [createOpen, setCreateOpen] = useState(false);

  const mine = agents.filter((a) => a.installed);
  const marketplace = agents;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Agents</h1>
          <p className="text-[13.5px] text-muted-foreground">Workflows that act on your behalf — always with your approval.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create agent
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mine">My agents</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {mine.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agents installed"
              body="Install an agent from the marketplace to let Alxioum handle a workflow for you — always with your approval for anything sensitive."
              action={
                <Button size="sm" onClick={() => setTab("marketplace")}>
                  Browse marketplace
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {mine.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-4 space-y-6">
          {CATEGORIES.map((cat) => {
            const items = marketplace.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((a) => (
                    <AgentCard key={a.id} agent={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create a custom agent" description="Custom agent building is coming soon.">
        <p className="text-[13.5px] text-muted-foreground">
          For now, explore the marketplace for ready-made agents like the Daily Planner and Study Planner. Custom, user-built workflows are on the roadmap.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setCreateOpen(false)}>Got it</Button>
        </div>
      </Modal>
    </div>
  );
}
