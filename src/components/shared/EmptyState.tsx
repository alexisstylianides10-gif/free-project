"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
  bare?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, cta, bare, className }: EmptyStateProps) {
  const inner = (
    <div className={cn("flex flex-col items-center gap-2 py-8 text-center", bare && "py-4")}>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-brand">
        <Icon className="h-5 w-5 text-white" />
      </span>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      {cta && (
        <Link href={cta.href} className="mt-2">
          <Button size="sm" variant="secondary">
            {cta.label}
          </Button>
        </Link>
      )}
    </div>
  );

  if (bare) return <div className={className}>{inner}</div>;

  return (
    <Card className={className}>
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
