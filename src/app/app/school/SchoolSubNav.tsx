"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/school", label: "Home", match: (p: string) => p === "/app/school" },
  { href: "/app/school/subjects", label: "Subjects", match: (p: string) => p.startsWith("/app/school/subjects") },
  { href: "/app/school/exams", label: "Exams", match: (p: string) => p.startsWith("/app/school/exams") },
  { href: "/app/school/flashcards", label: "Flashcards", match: (p: string) => p.startsWith("/app/school/flashcards") },
  { href: "/app/school/quizzes", label: "Quizzes", match: (p: string) => p.startsWith("/app/school/quizzes") },
  { href: "/app/school/progress", label: "Progress", match: (p: string) => p.startsWith("/app/school/progress") },
];

export function SchoolSubNav() {
  const pathname = usePathname();

  return (
    <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
