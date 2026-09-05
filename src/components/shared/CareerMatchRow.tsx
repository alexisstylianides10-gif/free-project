import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Career } from "@/lib/catalog/careers";

export function CareerMatchRow({ career, percent }: { career: Career; percent: number }) {
  const CareerIcon = career.icon;
  return (
    <Link
      href={`/app/future/${career.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand">
        <CareerIcon className="h-5 w-5 text-white" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{career.name}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{career.tagline}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-accent">{percent}%</span>
        <span className="block text-2xs text-muted-foreground">match</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
