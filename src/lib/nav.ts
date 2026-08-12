import {
  Sun,
  MessageCircle,
  Calendar,
  History,
  BrainCircuit,
  MessagesSquare,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "My Day", href: "/today", icon: Sun },
  { label: "Chat", href: "/app", icon: MessageCircle },
  { label: "History", href: "/history", icon: MessagesSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activity", href: "/activity", icon: History },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export const mobilePrimaryNav: NavItem[] = [
  { label: "My Day", href: "/today", icon: Sun },
  { label: "Chat", href: "/app", icon: MessageCircle },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activity", href: "/activity", icon: History },
];

export const mobileMoreNav: NavItem[] = [
  { label: "History", href: "/history", icon: MessagesSquare },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
];
