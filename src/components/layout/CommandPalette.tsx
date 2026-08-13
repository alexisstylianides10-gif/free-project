"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { CornerDownLeft, LogOut, Moon, Search, Sun, SunMoon } from "lucide-react";
import { primaryNav } from "@/lib/nav";
import { useAlxioum } from "@/lib/store";
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

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
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
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
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
      { id: "ask-alxioum", label: "Ask Alxioum something", hint: "Chat", icon: primaryNav.find((n) => n.label === "Chat")!.icon, run: () => router.push("/app/chat") },
      { id: "toggle-theme", label: `Switch theme to ${nextTheme}`, icon: themeIcon, run: () => updateProfile({ theme: nextTheme }) },
      { id: "sign-out", label: "Sign out", icon: LogOut, run: () => signOut() },
    ];
  }, [profile?.theme, router, updateProfile, signOut]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

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
              placeholder="Jump to a page, or run a command…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground sm:block">esc</kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">No matches.</p>}
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
                <span className="flex-1 truncate font-medium">{cmd.label}</span>
                {cmd.hint && <span className="text-[11px] text-muted-foreground">{cmd.hint}</span>}
                {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </motion.button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
