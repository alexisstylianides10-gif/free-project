"use client";

import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ListCard } from "@/components/domain/ListCard";

const EMOJI_OPTIONS = ["📋", "🛒", "🧳", "✨", "🎯", "📚", "🎁"];

export default function ListsPage() {
  const lists = useAlxioum((s) => s.lists);
  const createList = useAlxioum((s) => s.createList);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  function submit() {
    if (!name.trim()) return;
    createList(name.trim(), emoji);
    setName("");
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Lists</h1>
          <p className="text-[13.5px] text-muted-foreground">Shopping, packing, wishlists — as many as you need.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New list
        </Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No lists yet"
          body='Create a shopping list, packing list, or anything else. Try asking AI: "Create a packing list for Hong Kong."'
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Create a list
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <ListCard key={l.id} list={l} />
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="New list" description="Give it a name and pick an icon.">
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="List name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[16px] transition-colors ${
                  emoji === e ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
