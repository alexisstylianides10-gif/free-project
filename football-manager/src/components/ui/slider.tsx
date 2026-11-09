"use client";
import * as React from "react";
import * as S from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({ value, onChange, min = 1, max = 5, step = 1, className, labels, label, testId }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string; labels?: string[]; label?: string; testId?: string }) {
  return (
    <div className={cn("w-full", className)} data-testid={testId}>
      <S.Root className="relative flex h-5 w-full touch-none select-none items-center" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} aria-label={label}>
        <S.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
          <S.Range className="absolute h-full bg-accent" />
        </S.Track>
        <S.Thumb className="block h-4 w-4 rounded-full border-2 border-accent bg-bg shadow focus:outline-none focus:ring-2 focus:ring-accent/40" aria-label={label} />
      </S.Root>
      {labels ? (
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted">
          <span>{labels[0]}</span>
          <span className="text-fg/80">{labels[Math.round(((value - min) / (max - min)) * (labels.length - 1))] ?? ""}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}
