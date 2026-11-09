"use client";
import { useState } from "react";
import { useGame, useWorld } from "@/store/game";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/misc";
import { PageTitle } from "@/components/game/common";
import { userNews } from "@/engine/world/news";
import { longDate, label } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function InboxPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const items = userNews(world).filter((n) => cat === "all" || n.category === cat);
  const cats = Array.from(new Set(userNews(world).map((n) => n.category)));
  const sel = items.find((n) => n.id === open) ?? items[0];
  const markAll = () => mutate((w) => w.news.forEach((n) => (n.read = true)));
  return (
    <div>
      <PageTitle title="Inbox" sub="Club news, match reports, board messages and transfer offers" actions={<><Select label="Category" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...cats.map((c) => ({ value: c, label: label(c) }))]} className="w-44" /><Button size="sm" onClick={markAll}>Mark all read</Button></>} />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="max-h-[75vh] overflow-auto">
          {items.length === 0 ? <Empty title="No messages" /> : items.map((n) => (
            <button key={n.id} onClick={() => { setOpen(n.id); if (!n.read) mutate(() => (n.read = true)); }} className={cn("block w-full border-t border-line/60 px-4 py-2.5 text-left first:border-0 hover:bg-surface2/60", sel?.id === n.id && "bg-surface2")}>
              <div className="flex items-center gap-2">
                {!n.read ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                <span className={cn("truncate text-sm", !n.read && "font-semibold")}>{n.title}</span>
              </div>
              <div className="text-xs text-muted">{longDate(n.date)} · {label(n.category)}</div>
            </button>
          ))}
        </Card>
        <Card>
          {sel ? (
            <div className="p-6">
              <div className="mb-2 flex gap-2"><Badge>{label(sel.category)}</Badge>{sel.important ? <Badge tone="gold">Important</Badge> : null}</div>
              <h2 className="text-xl font-semibold">{sel.title}</h2>
              <div className="mt-1 text-xs text-muted">{longDate(sel.date)}</div>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-fg/90">{sel.body}</p>
            </div>
          ) : <Empty title="Select a message" />}
        </Card>
      </div>
    </div>
  );
}
