"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { CalendarRange, CornerDownLeft, LogOut, MessageCircle, Moon, Search, Sun, SunMoon, Timer } from "lucide-react";
import { primaryNav } from "@/lib/nav";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { Document } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const profile = useAlxioum((s) => s.profile);
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const signOut = useAlxioum((s) => s.signOut);
  const authUserId = useAlxioum((s) => s.authUserId);
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const goals = useAlxioum((s) => s.goals);
  const shoppingItems = useAlxioum((s) => s.shoppingItems);
  const routines = useAlxioum((s) => s.routines);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [docResults, setDocResults] = useState<Document[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("alxioum:open-command-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("alxioum:open-command-palette", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setDocResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Document text isn't preloaded into the store (can be large), so search
  // it server-side with a short debounce instead of client-side filtering.
  useEffect(() => {
    const q = query.trim();
    if (!authUserId || q.length < 2) {
      setDocResults([]);
      return;
    }
    const handle = setTimeout(() => {
      db.searchDocuments(authUserId, q, 5).then(setDocResults).catch(() => setDocResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, authUserId]);

  const staticCommands = useMemo<Command[]>(() => {
    const nextTheme = profile?.theme === "light" ? "dark" : profile?.theme === "dark" ? "system" : "light";
    const themeIcon = nextTheme === "dark" ? Moon : nextTheme === "light" ? Sun : SunMoon;
    const nav = primaryNav.map((item) => ({
      id: `go-${item.href}`,
      label: `Go to ${item.label}`,
      icon: item.icon,
      run: () => router.push(item.href),
    }));
    return [
      ...nav,
      { id: "new-task", label: "New task", hint: "Tasks", icon: primaryNav.find((n) => n.label === "Tasks")!.icon, run: () => router.push("/app/tasks") },
      { id: "new-event", label: "New event", hint: "Calendar", icon: primaryNav.find((n) => n.label === "Calendar")!.icon, run: () => router.push("/app/calendar") },
      // Focus and Weekly Review are deliberately kept off the persistent nav
      // (reachable from My Day/Chat instead, to keep the sidebar lean) but
      // should still be findable here — otherwise Cmd/Ctrl+K can't reach them.
      { id: "go-focus", label: "Go to Focus", icon: Timer, run: () => router.push("/app/focus") },
      { id: "go-weekly-review", label: "Go to Weekly Review", hint: "Your week", icon: CalendarRange, run: () => router.push("/app/weekly-review") },
      { id: "toggle-theme", label: `Switch theme to ${nextTheme}`, icon: themeIcon, run: () => updateProfile({ theme: nextTheme }) },
      { id: "sign-out", label: "Sign out", icon: LogOut, run: () => signOut() },
    ];
  }, [profile?.theme, router, updateProfile, signOut]);

  const searchResults = useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: Command[] = [];
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q)) results.push({ id: `task-${t.id}`, label: t.title, hint: "Tasks", icon: primaryNav.find((n) => n.label === "Tasks")!.icon, run: () => router.push("/app/tasks") });
    }
    for (const e of events) {
      if (e.title.toLowerCase().includes(q)) results.push({ id: `event-${e.id}`, label: e.title, hint: "Calendar", icon: primaryNav.find((n) => n.label === "Calendar")!.icon, run: () => router.push("/app/calendar") });
    }
    for (const g of goals) {
      if (g.name.toLowerCase().includes(q)) results.push({ id: `goal-${g.id}`, label: g.name, hint: "Goals", icon: primaryNav.find((n) => n.label === "Goals")!.icon, run: () => router.push("/app/goals") });
    }
    for (const item of shoppingItems) {
      if (item.name.toLowerCase().includes(q)) results.push({ id: `shopping-${item.id}`, label: item.name, hint: "Shopping", icon: primaryNav.find((n) => n.label === "Shopping")!.icon, run: () => router.push("/app/shopping") });
    }
    for (const r of routines) {
      if (r.name.toLowerCase().includes(q)) results.push({ id: `routine-${r.id}`, label: r.name, hint: "Routines", icon: primaryNav.find((n) => n.label === "Routines")!.icon, run: () => router.push("/app/routines") });
    }
    for (const doc of docResults) {
      results.push({ id: `doc-${doc.id}`, label: doc.name, hint: "Documents", icon: primaryNav.find((n) => n.label === "Documents")!.icon, run: () => router.push("/app/documents") });
    }
    return results.slice(0, 8);
  }, [query, tasks, events, goals, shoppingItems, routines, docResults, router]);

  const matchedStatic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticCommands;
    return staticCommands.filter((c) => c.label.toLowerCase().includes(q));
  }, [staticCommands, query]);

  // Free-text "ask Alxioum" is always available and isn't filtered by the
  // query match logic above — it IS the fallback for anything that doesn't
  // match a page or a specific item.
  const askCommand = useMemo<Command>(() => {
    const q = query.trim();
    return {
      id: "ask-alxioum",
      label: q ? `Ask Alxioum: "${q}"` : "Ask Alxioum something",
      hint: "Chat",
      icon: MessageCircle,
      run: () => router.push(q ? `/app/chat?prefill=${encodeURIComponent(q)}` : "/app/chat"),
    };
  }, [query, router]);

  const filtered = useMemo(() => [...searchResults, ...matchedStatic, askCommand], [searchResults, matchedStatic, askCommand]);

  function run(cmd: Command) {
    cmd.run();
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) run(filtered[activeIndex]);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[18%] z-[60] w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search everything, or ask Alxioum…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground sm:block">esc</kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {filtered.map((cmd, i) => (
              <motion.button
                key={cmd.id}
                onClick={() => run(cmd)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors",
                  i === activeIndex ? "bg-accent-soft text-accent" : "text-foreground"
                )}
              >
                <cmd.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium">{cmd.label}</span>
                {cmd.hint && <span className="shrink-0 text-[11px] text-muted-foreground">{cmd.hint}</span>}
                {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </motion.button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
