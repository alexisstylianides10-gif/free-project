"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Logo({ className, glow = true }: { className?: string; glow?: boolean }) {
  const gradId = useId();

  return (
    <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center", className)}>
      {glow && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #4F6EF7, #9D4EDD)", filter: "blur(9px)" }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.88, 1.06, 0.88] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <svg viewBox="0 0 32 32" className="relative h-full w-full">
        <defs>
          <linearGradient id={`${gradId}-bg`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4F6EF7" />
            <stop offset="0.55" stopColor="#7B5CF0" />
            <stop offset="1" stopColor="#9D4EDD" />
          </linearGradient>
          <linearGradient id={`${gradId}-sheen`} x1="16" y1="2" x2="16" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill={`url(#${gradId}-bg)`} />
        <rect width="32" height="16" rx="8" fill={`url(#${gradId}-sheen)`} />
        <path
          d="M16 7 L10 24 M16 7 L22 24 M12.6 17.5 H19.4"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
