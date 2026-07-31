import {
  BookOpen,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Plane,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CalendarEvent } from "./types";

export const eventTypeMeta: Record<CalendarEvent["type"], { icon: LucideIcon; label: string; tone: string }> = {
  school: { icon: GraduationCap, label: "School", tone: "text-accent" },
  health: { icon: HeartPulse, label: "Health", tone: "text-danger" },
  social: { icon: Users, label: "Social", tone: "text-warning" },
  study: { icon: BookOpen, label: "Study", tone: "text-success" },
  work: { icon: Briefcase, label: "Work", tone: "text-accent" },
  personal: { icon: User, label: "Personal", tone: "text-muted-foreground" },
  travel: { icon: Plane, label: "Travel", tone: "text-warning" },
};
