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

  const unlocked = profile.plan === "Student" || profile.plan === "Max";

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-400/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-card">
          <Lock className="h-5 w-5" />
        </div>
        <p className="text-[16px] font-semibold text-foreground">Study tools are a Student perk</p>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Focus Mode, Subjects, and the Study Planner are included with the Student plan (and Max). Switch plans in Settings to try it out.
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-5 text-white shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-2 text-[13px] font-medium text-white/80">
          <GraduationCap className="h-4 w-4" /> Study
        </div>
        <h1 className="relative mt-1 text-[20px] font-semibold tracking-tight">Stay on top of your subjects</h1>
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
                active ? "text-white" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="study-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600"
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
