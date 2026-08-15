import {
  MessageCircle,
  Sun,
  Calendar,
  CheckSquare,
  BrainCircuit,
  Bot,
  Settings,
  GraduationCap,
  ShoppingCart,
  Target,
  History,
  Repeat,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { Plan } from "./types";

export type NavGroup = "CORE" | "LIFE" | "INTELLIGENCE";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, only shown to accounts on one of these plans. */
  planGate?: Plan[];
  /** Sidebar grouping. Items without a group (Settings) render outside the grouped list. */
  group?: NavGroup;
}

export const NAV_GROUP_ORDER: NavGroup[] = ["CORE", "LIFE", "INTELLIGENCE"];

/** The sections of the product, in nav order. Every route lives under /app. */
export const primaryNav: NavItem[] = [
  { label: "My Day", href: "/app/today", icon: Sun, group: "CORE" },
  { label: "Chat", href: "/app/chat", icon: MessageCircle, group: "CORE" },
  { label: "Calendar", href: "/app/calendar", icon: Calendar, group: "CORE" },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare, group: "CORE" },
  { label: "Study", href: "/app/study", icon: GraduationCap, planGate: ["Student"], group: "LIFE" },
  { label: "Shopping", href: "/app/shopping", icon: ShoppingCart, group: "LIFE" },
  { label: "Goals", href: "/app/goals", icon: Target, group: "LIFE" },
  { label: "Routines", href: "/app/routines", icon: Repeat, group: "LIFE" },
  { label: "Documents", href: "/app/documents", icon: FileText, group: "LIFE" },
  { label: "Memory", href: "/app/memory", icon: BrainCircuit, group: "INTELLIGENCE" },
  { label: "Activity", href: "/app/activity", icon: History, group: "INTELLIGENCE" },
  { label: "Agents", href: "/app/agents", icon: Bot, group: "INTELLIGENCE" },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export const mobilePrimaryNav: NavItem[] = [
  { label: "My Day", href: "/app/today", icon: Sun },
  { label: "Chat", href: "/app/chat", icon: MessageCircle },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare },
];

export const mobileMoreNav: NavItem[] = [
  { label: "Shopping", href: "/app/shopping", icon: ShoppingCart },
  { label: "Goals", href: "/app/goals", icon: Target },
  { label: "Routines", href: "/app/routines", icon: Repeat },
  { label: "Documents", href: "/app/documents", icon: FileText },
  { label: "Study", href: "/app/study", icon: GraduationCap, planGate: ["Student"] },
  { label: "Memory", href: "/app/memory", icon: BrainCircuit },
  { label: "Activity", href: "/app/activity", icon: History },
  { label: "Agents", href: "/app/agents", icon: Bot },
];

export function visibleNav(items: NavItem[], plan: Plan | undefined): NavItem[] {
  return items.filter((i) => !i.planGate || i.planGate.includes(plan ?? "Free"));
}
