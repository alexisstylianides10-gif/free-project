"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Logo({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center", className)}>
      {glow && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #7C3AED, #D946EF)", filter: "blur(9px)" }}
          animate={{ opacity: [0.16, 0.3, 0.16], scale: [0.92, 1.02, 0.92] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/mark-256.png" alt="Alxioum" className="relative h-full w-full rounded-[10px]" />
    </div>
  );
}
