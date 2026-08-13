"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Logo({ className, glow = true }: { className?: string; glow?: boolean }) {
  const id = useId();

  return (
    <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center", className)}>
      {glow && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #5B8CFF, #B24FE0)", filter: "blur(9px)" }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.88, 1.06, 0.88] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <defs>
          <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0B0C16" />
            <stop offset="1" stopColor="#05060B" />
          </linearGradient>
          <linearGradient id={`${id}-lu`} x1="50" y1="18" x2="31" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9BDBFF" />
            <stop offset="1" stopColor="#4F86F0" />
          </linearGradient>
          <linearGradient id={`${id}-ll`} x1="31" y1="55" x2="20" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3E63E0" />
            <stop offset="1" stopColor="#5B3FD6" />
          </linearGradient>
          <linearGradient id={`${id}-ru`} x1="50" y1="18" x2="69" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8E9BFF" />
            <stop offset="1" stopColor="#8B5CF0" />
          </linearGradient>
          <linearGradient id={`${id}-rl`} x1="69" y1="55" x2="80" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7B4CE0" />
            <stop offset="1" stopColor="#B24FE0" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill={`url(#${id}-tile)`} />
        <motion.g
          animate={glow ? { opacity: [0.4, 0.75, 0.4] } : undefined}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: "blur(3.5px)" }}
        >
          <path d="M50,18 L57,20 L45.5,56.3 L31.3,55.4 Z" fill="#5B8CFF" />
          <path d="M50,18 L43,20 L54.5,56.3 L68.7,55.4 Z" fill="#9B5CF0" />
        </motion.g>
        <path d="M50,18 L57,20 L45.5,56.3 L31.3,55.4 Z" fill={`url(#${id}-lu)`} />
        <path d="M31.3,55.4 L45.5,56.3 L36,86 L16,86 Z" fill={`url(#${id}-ll)`} />
        <path d="M50,18 L43,20 L54.5,56.3 L68.7,55.4 Z" fill={`url(#${id}-ru)`} />
        <path d="M68.7,55.4 L54.5,56.3 L64,86 L84,86 Z" fill={`url(#${id}-rl)`} />
        <path d="M50,18 L16,86 M50,18 L84,86" stroke="#CFE6FF" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
      </svg>
    </div>
  );
}
