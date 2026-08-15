import { MessageCircle, Sun, Calendar, CheckSquare, BrainCircuit, Bot, Settings, GraduationCap, type LucideIcon } from "lucide-react";
import type { Plan } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, only shown to accounts on one of these plans. */
  planGate?: Plan[];
}

/** The sections of the product, in nav order. Every route lives under /app. */
export const primaryNav: NavItem[] = [
  { label: "Chat", href: "/app/chat", icon: MessageCircle },
  { label: "My Day", href: "/app/today", icon: Sun },
  { label: "Study", href: "/app/study", icon: GraduationCap, planGate: ["Student"] },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { label: "Memory", href: "/app/memory", icon: BrainCircuit },
  { label: "Agents", href: "/app/agents", icon: Bot },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export const mobilePrimaryNav: NavItem[] = [
  { label: "My Day", href: "/app/today", icon: Sun },
  { label: "Chat", href: "/app/chat", icon: MessageCircle },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare },
];

export const mobileMoreNav: NavItem[] = [
  { label: "Memory", href: "/app/memory", icon: BrainCircuit },
  { label: "Study", href: "/app/study", icon: GraduationCap, planGate: ["Student"] },
  { label: "Agents", href: "/app/agents", icon: Bot },
];

export function visibleNav(items: NavItem[], plan: Plan | undefined): NavItem[] {
  return items.filter((i) => !i.planGate || i.planGate.includes(plan ?? "Free"));
}
