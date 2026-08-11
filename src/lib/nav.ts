import {
  Home,
  Sparkles,
  Sun,
  CheckSquare,
  Calendar,
  Target,
  Wallet,
  FileText,
  Repeat,
  ListChecks,
  BarChart3,
  Bot,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/app", icon: Home },
  { label: "AI", href: "/ai", icon: Sparkles },
  { label: "Today", href: "/today", icon: Sun },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Habits", href: "/habits", icon: Repeat },
  { label: "Lists", href: "/lists", icon: ListChecks },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
];

export const mobilePrimaryNav: NavItem[] = [
  { label: "Home", href: "/app", icon: Home },
  { label: "Today", href: "/today", icon: Sun },
  { label: "AI", href: "/ai", icon: Sparkles },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export const mobileMoreNav: NavItem[] = [
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Habits", href: "/habits", icon: Repeat },
  { label: "Lists", href: "/lists", icon: ListChecks },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
];
