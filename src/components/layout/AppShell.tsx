"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Logo } from "./Logo";
import { backendConfigured, useAlxioum } from "@/lib/store";

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

  return (
    <TooltipProvider>
      <Sidebar />
      <div className="flex min-h-dvh flex-col md:pl-64">
        <TopBar />
        <main className="flex-1 pb-20 md:pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
