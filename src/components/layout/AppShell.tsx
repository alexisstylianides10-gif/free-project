"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { CommandBar } from "./CommandBar";
import { QuickAddModal } from "./QuickAddModal";
import { TooltipProvider } from "@/components/ui/Tooltip";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
      <CommandBar />
      <QuickAddModal />
    </TooltipProvider>
  );
}
