import { MessageCircle, Sun, Calendar, CheckSquare, BrainCircuit, Bot, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** The 7 sections of the product, in nav order. Every route lives under /app. */
export const primaryNav: NavItem[] = [
  { label: "Chat", href: "/app/chat", icon: MessageCircle },
  { label: "My Day", href: "/app/today", icon: Sun },
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
  { label: "Agents", href: "/app/agents", icon: Bot },
];
