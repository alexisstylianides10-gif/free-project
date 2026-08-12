"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

const ActiveTabContext = createContext<{ value?: string; layoutId: string }>({ layoutId: "tabs" });

export function Tabs({ value, onValueChange, children, ...props }: RadixTabs.TabsProps) {
  const layoutId = useId();
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} {...props}>
      <ActiveTabContext.Provider value={{ value, layoutId }}>{children}</ActiveTabContext.Provider>
    </RadixTabs.Root>
  );
}

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn("inline-flex items-center gap-1 rounded-lg bg-muted p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, value, children, ...props }: RadixTabs.TabsTriggerProps) {
  const ctx = useContext(ActiveTabContext);
  const isActive = ctx.value === value;
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={`${ctx.layoutId}-active-pill`}
          className="absolute inset-0 rounded-md bg-surface shadow-subtle"
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </RadixTabs.Trigger>
  );
}

export const TabsContent = RadixTabs.Content;
