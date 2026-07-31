import {
  CalendarClock,
  GraduationCap,
  PiggyBank,
  FileSearch,
  Plane,
  Mail,
  Search,
  ShoppingCart,
  Bot,
  type LucideIcon,
} from "lucide-react";

export const agentIconMap: Record<string, LucideIcon> = {
  CalendarClock,
  GraduationCap,
  PiggyBank,
  FileSearch,
  Plane,
  Mail,
  Search,
  ShoppingCart,
};

export function getAgentIcon(name: string): LucideIcon {
  return agentIconMap[name] ?? Bot;
}
