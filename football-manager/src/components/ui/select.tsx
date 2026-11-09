"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Accessible native select styled for the dark theme. */
export function Select<T extends string>({ value, onChange, options, className, label, testId, disabled }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string; testId?: string; disabled?: boolean }) {
  return (
    <select aria-label={label} data-testid={testId} disabled={disabled} className={cn("field cursor-pointer appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238b9bb0' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")" }} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
