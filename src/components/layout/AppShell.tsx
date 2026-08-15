"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Logo } from "./Logo";
import { backendConfigured, useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authStatus = useAlxioum((s) => s.authStatus);
  const dataLoading = useAlxioum((s) => s.dataLoading);
  const profile = useAlxioum((s) => s.profile);
  const initAuth = useAlxioum((s) => s.initAuth);

  useEffect(() => {
    if (backendConfigured) initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (backendConfigured && authStatus === "signed_out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, pathname, router]);

  useEffect(() => {
    if (authStatus === "signed_in" && profile && !profile.onboarded && pathname !== "/app/onboarding") {
      router.replace("/app/onboarding");
    }
  }, [authStatus, profile, pathname, router]);

  if (!backendConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          Alxioum isn&apos;t connected to a backend yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
        </p>
      </div>
    );
  }

  if (authStatus === "checking" || authStatus === "signed_out" || (authStatus === "signed_in" && dataLoading)) {
    return <LoadingScreen />;
  }

  if (profile && !profile.onboarded && pathname !== "/app/onboarding") {
    return <LoadingScreen />;
  }

  if (pathname === "/app/onboarding") {
    return <>{children}</>;
  }

  const isChatRoute = pathname === "/app/chat";

  return (
    <TooltipProvider>
      <CommandPalette />
      <Sidebar />
      <div className={cn("flex flex-col md:pl-64", isChatRoute ? "h-dvh" : "min-h-dvh")}>
        <div className="shrink-0">
          <TopBar />
        </div>
        <main className={cn("flex flex-1 flex-col", isChatRoute ? "min-h-0 pb-16 md:pb-0" : "pb-20 md:pb-10")}>
          {/*
            This used to be a Framer Motion <AnimatePresence> fade. When a
            route change was triggered from inside a closing Radix Dialog
            (the mobile "More" sheet), the two components' updates could
            land in the same commit and Framer Motion's JS-driven animation
            would never get a chance to run its mount transition — the new
            page's wrapper stayed frozen at its `initial` (opacity: 0) style
            forever, i.e. a permanently blank content area. A plain CSS
            `@keyframes` animation isn't driven by React effect timing at
            all — the browser plays it as soon as the element is painted,
            so this failure mode can't happen. `key={pathname}` still forces
            a remount so the animation replays on every navigation.
          */}
          <div
            key={pathname}
            className={cn("flex min-h-0 flex-1 flex-col animate-fade-up", isChatRoute ? "" : "mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8")}
          >
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </TooltipProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Logo className="animate-pulse" />
    </div>
  );
}
