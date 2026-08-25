import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound, type LucideIcon } from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

/** Shared between BottomNav (mobile) and SidebarNav (tablet/desktop) so the
 * two responsive nav treatments never drift out of sync. */
export const STUDENT_TABS: NavTab[] = [
  { href: "/app", label: "Home", icon: Home, match: (p) => p === "/app" },
  { href: "/app/school", label: "School", icon: GraduationCap, match: (p) => p.startsWith("/app/school") },
  { href: "/app/future", label: "Future", icon: Compass, match: (p) => p.startsWith("/app/future") },
  { href: "/app/coach", label: "Coach", icon: Sparkles, match: (p) => p.startsWith("/app/coach") },
  { href: "/app/profile", label: "Profile", icon: CircleUserRound, match: (p) => p.startsWith("/app/profile") },
];

export const BUSINESS_TABS: NavTab[] = [
  { href: "/app", label: "Home", icon: Home, match: (p) => p === "/app" },
  { href: "/app/school", label: "Plan", icon: Target, match: (p) => p.startsWith("/app/school") },
  { href: "/app/future", label: "Grow", icon: TrendingUp, match: (p) => p.startsWith("/app/future") },
  { href: "/app/coach", label: "Coach", icon: Sparkles, match: (p) => p.startsWith("/app/coach") },
  { href: "/app/profile", label: "Profile", icon: CircleUserRound, match: (p) => p.startsWith("/app/profile") },
];
