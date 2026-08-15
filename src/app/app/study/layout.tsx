"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Lock } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/app/study" },
  { label: "Focus", href: "/app/study/focus" },
  { label: "Subjects", href: "/app/study/subjects" },
  { label: "Planner", href: "/app/study/planner" },
];

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  const profile = useAlxioum((s) => s.profile);
  const pathname = usePathname();

  if (!profile) return null;

  const unlocked = profile.plan === "Student";

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <p className="text-[16px] font-semibold text-foreground">Study tools are a Student perk</p>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Focus Mode, Subjects, and the Study Planner are included with the Student plan. Switch plans in Settings to try it out.
        </p>
        <Link href="/app/settings" className="mt-5">
          <Button>
            <GraduationCap className="h-4 w-4" /> Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Study</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Stay on top of your subjects</p>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const active = tab.href === "/app/study" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                active ? "text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="study-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
