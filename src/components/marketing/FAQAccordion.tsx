"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "What is Alxioum?", a: "A personal AI assistant that takes real actions in your calendar, tasks, and memory from natural-language requests, always asking permission first." },
  { q: "How is it different from ChatGPT?", a: "Alxioum is built around an action layer: it doesn't just describe what you could do, it proposes the exact change and, once you confirm, actually makes it in your account." },
  { q: "Does Alxioum take actions?", a: "Yes — creating, updating, deleting, or completing something always goes through a confirmation card first. Nothing changes silently." },
  { q: "Does Alxioum store my information?", a: "It stores what you give it — calendar events, tasks, memories, and chat history — so it can act on your behalf. See Settings → \"What Alxioum knows\" for exactly what's stored." },
  { q: "Can I delete my data?", a: "Yes, any time. Delete individual items, export everything, or delete all of your data permanently from Settings." },
  { q: "What AI powers Alxioum?", a: "Claude, from Anthropic, powers the Head Agent today. The AI layer is built behind an internal abstraction, so the underlying model can change without changing how Alxioum behaves." },
  { q: "Can Alxioum access my calendar?", a: "Only the calendar events you create inside Alxioum today. External calendar sync (Google/Outlook) isn't built yet." },
  { q: "What integrations are available?", a: "Calendar, Tasks, and Memory are live. Email, Finance, Travel, Shopping, Documents, and Research are architected but marked \"Coming soon\" until they're actually built." },
  { q: "Is Alxioum free?", a: "Yes — the Free plan includes a limited number of AI actions per month at no cost. Pro raises that limit." },
  { q: "What happens when an action requires confirmation?", a: "You'll see exactly what's about to happen with Confirm and Cancel buttons. Nothing executes until you tap Confirm; Cancel discards it with no changes made." },
];

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
      {FAQS.map((f, i) => (
        <div key={f.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
            <span className="text-[14px] font-medium text-foreground">{f.q}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
