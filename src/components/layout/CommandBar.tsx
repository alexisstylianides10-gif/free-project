"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { CornerDownLeft, Search, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { primaryNav } from "@/lib/nav";
import { searchAll } from "@/lib/search";
import { interpretCommand } from "@/lib/commands";
import { cn } from "@/lib/utils";

export function CommandBar() {
  const open = useAlxioum((s) => s.commandOpen);
  const setOpen = useAlxioum((s) => s.setCommandOpen);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const documents = useAlxioum((s) => s.documents);
  const goals = useAlxioum((s) => s.goals);
  const memory = useAlxioum((s) => s.memory);
  const lists = useAlxioum((s) => s.lists);
  const addEvent = useAlxioum((s) => s.addEvent);
  const addTask = useAlxioum((s) => s.addTask);
  const addListItem = useAlxioum((s) => s.addListItem);
  const createList = useAlxioum((s) => s.createList);
  const openQuickAdd = useAlxioum((s) => s.openQuickAdd);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => searchAll(query, { tasks, events, documents, goals, memory, lists }), [query, tasks, events, documents, goals, memory, lists]);
  const command = useMemo(() => interpretCommand(query), [query]);

  function runCommand(fn: () => void) {
    fn();
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[14vh] z-[60] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop data-[state=open]:animate-scale-in"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command bar</Dialog.Title>
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search or tell Alxioum what you need..."
                className="h-12 flex-1 bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              {command && (
                <Command.Group heading="Do this" className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Command.Item
                    onSelect={() => runCommand(() => command.run({ addEvent, addTask, addListItem, createList, findListId: (name) => lists.find((l) => l.name.toLowerCase().includes(name.toLowerCase()))?.id, navigate: (href) => router.push(href), openQuickAdd }))}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-accent-soft"
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{command.label}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{command.detail}</p>
                    </div>
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>
                </Command.Group>
              )}

              {query && results.length > 0 && (
                <Command.Group heading="Results" className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {results.map((r) => (
                    <Command.Item
                      key={r.type + r.id}
                      onSelect={() => runCommand(() => router.push(r.href))}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.title}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {r.type} · {r.subtitle}
                        </p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {!query && (
                <Command.Group heading="Go to" className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {primaryNav.map((item) => (
                    <Command.Item
                      key={item.href}
                      onSelect={() => runCommand(() => router.push(item.href))}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {query && results.length === 0 && !command && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Try “Add milk to shopping list”, “Show my expenses”, or search for anything in Alxioum.
                </div>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
