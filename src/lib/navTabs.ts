import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound, type LucideIcon } from "lucide-react";

export interface NavTab {
  href: string;
  /** Translation key into the "NavTabs" i18n namespace — labels are resolved
   * at render time via useTranslations("NavTabs") in BottomNav/SidebarNav/
   * TopBar rather than stored as literal English strings here. */
  labelKey: "home" | "school" | "future" | "coach" | "profile" | "plan" | "grow";
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

/** Shared between BottomNav (mobile) and SidebarNav (tablet/desktop) so the
 * two responsive nav treatments never drift out of sync. */
export const STUDENT_TABS: NavTab[] = [
  { href: "/app", labelKey: "home", icon: Home, match: (p) => p === "/app" },
  { href: "/app/school", labelKey: "school", icon: GraduationCap, match: (p) => p.startsWith("/app/school") },
  { href: "/app/future", labelKey: "future", icon: Compass, match: (p) => p.startsWith("/app/future") },
  { href: "/app/coach", labelKey: "coach", icon: Sparkles, match: (p) => p.startsWith("/app/coach") },
  { href: "/app/profile", labelKey: "profile", icon: CircleUserRound, match: (p) => p.startsWith("/app/profile") },
];

export const BUSINESS_TABS: NavTab[] = [
  { href: "/app", labelKey: "home", icon: Home, match: (p) => p === "/app" },
  { href: "/app/school", labelKey: "plan", icon: Target, match: (p) => p.startsWith("/app/school") },
  { href: "/app/future", labelKey: "grow", icon: TrendingUp, match: (p) => p.startsWith("/app/future") },
  { href: "/app/coach", labelKey: "coach", icon: Sparkles, match: (p) => p.startsWith("/app/coach") },
  { href: "/app/profile", labelKey: "profile", icon: CircleUserRound, match: (p) => p.startsWith("/app/profile") },
];
