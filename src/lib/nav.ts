import {
  MessageCircle,
  Calendar,
  History,
  BrainCircuit,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Chat", href: "/app", icon: MessageCircle },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activity", href: "/activity", icon: History },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export const mobilePrimaryNav: NavItem[] = [
  { label: "Chat", href: "/app", icon: MessageCircle },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activity", href: "/activity", icon: History },
];

export const mobileMoreNav: NavItem[] = [
  { label: "Memory", href: "/memory", icon: BrainCircuit },
];
