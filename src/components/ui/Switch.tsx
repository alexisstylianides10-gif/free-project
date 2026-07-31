"use client";

import * as RadixSwitch from "@radix-ui/react-switch";

export function Switch({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative h-6 w-10 shrink-0 rounded-full bg-muted transition-colors data-[state=checked]:bg-accent disabled:opacity-40"
    >
      <RadixSwitch.Thumb className="block h-4.5 w-4.5 translate-x-1 rounded-full bg-white shadow-subtle transition-transform duration-150 data-[state=checked]:translate-x-[19px]" style={{ height: 18, width: 18 }} />
    </RadixSwitch.Root>
  );
}
