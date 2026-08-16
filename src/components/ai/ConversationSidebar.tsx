"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Search, Pencil, Check, X } from "lucide-react";
import { Conversation } from "@/lib/types";
import { searchConversations } from "@/lib/db";
import { cn } from "@/lib/utils";

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return "Older";
}

function groupByDate(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const order = ["Today", "Yesterday"];
  const groups = new Map<string, Conversation[]>();
  for (const c of conversations) {
    const label = dateGroupLabel(c.updatedAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(c);
  }
  const labels = [...groups.keys()].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    if (a === "Older") return 1;
    if (b === "Older") return -1;
    return 0;
  });
  return labels.map((label) => ({ label, items: groups.get(label)! }));
}

interface ConversationSidebarProps {
  userId: string;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ConversationSidebar({ userId, conversations, activeId, onSelect, onNew, onDelete, onRename }: ConversationSidebarProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      searchConversations(userId, trimmed)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, userId]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function startEdit(c: Conversation) {
    setEditingId(c.id);
    setEditValue(c.title);
  }

  function commitEdit() {
    const title = editValue.trim();
    if (editingId && title) onRename(editingId, title);
    setEditingId(null);
  }

  const list = searchResults ?? conversations;
  const groups = searchResults ? [{ label: `Results for "${query.trim()}"`, items: searchResults }] : groupByDate(list);

  return (
    <div className="flex h-full flex-col">
      <NewChatButton onNew={onNew} />
      <div className="relative mb-2 px-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats…"
          className="w-full rounded-lg border border-border/70 bg-background py-1.5 pl-8 pr-2.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((c) => (
                <div key={c.id} className="group relative">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1 py-1 pl-2.5 pr-1.5">
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-md border border-accent/40 bg-background px-1.5 py-1 text-[13px] text-foreground focus:outline-none"
                      />
                      <button onClick={commitEdit} className="rounded p-1 text-accent hover:bg-accent-soft" aria-label="Save name">
                        <Check className="h-3 w-3" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          "w-full truncate rounded-lg py-2 pl-2.5 pr-14 text-left text-[13px] font-medium transition-colors",
                          c.id === activeId ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {c.title}
                      </button>
                      <div className="absolute right-1.5 top-1.5 hidden items-center gap-0.5 group-hover:flex">
                        <button onClick={() => startEdit(c)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Rename conversation">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => onDelete(c.id)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Delete conversation">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {searchResults && searchResults.length === 0 && <p className="px-2.5 text-[12.5px] text-muted-foreground">No chats match that search.</p>}
      </div>
    </div>
  );
}

function NewChatButton({ onNew }: { onNew: () => void }) {
  return (
    <button
      onClick={onNew}
      className="mb-2 flex w-full items-center justify-start gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted"
    >
      <Plus className="h-3.5 w-3.5" /> New chat
    </button>
  );
}
