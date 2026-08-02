import { Home, Map, Compass, Inbox, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Trips", href: "/trips", icon: Map },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Profile", href: "/profile", icon: User },
];
