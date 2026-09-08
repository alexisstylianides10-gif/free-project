"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/school", labelKey: "home", match: (p: string) => p === "/app/school" },
  { href: "/app/school/subjects", labelKey: "subjects", match: (p: string) => p.startsWith("/app/school/subjects") },
  { href: "/app/school/notes", labelKey: "notes", match: (p: string) => p.startsWith("/app/school/notes") },
  { href: "/app/school/exams", labelKey: "exams", match: (p: string) => p.startsWith("/app/school/exams") },
  { href: "/app/school/homework", labelKey: "homework", match: (p: string) => p.startsWith("/app/school/homework") },
  { href: "/app/school/flashcards", labelKey: "flashcards", match: (p: string) => p.startsWith("/app/school/flashcards") },
  { href: "/app/school/quizzes", labelKey: "quizzes", match: (p: string) => p.startsWith("/app/school/quizzes") },
  { href: "/app/school/progress", labelKey: "progress", match: (p: string) => p.startsWith("/app/school/progress") },
];

export function SchoolSubNav() {
  const pathname = usePathname();
  const t = useTranslations("SchoolSubNav");

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
              active ? "bg-gradient-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
