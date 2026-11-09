"use client";
import * as React from "react";
import * as S from "@radix-ui/react-switch";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <S.Root checked={checked} onCheckedChange={onChange} className="relative h-5 w-9 rounded-full bg-line transition-colors data-[state=checked]:bg-accent" aria-label={label}>
        <S.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </S.Root>
    </label>
  );
}
