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
          style={{ background: "linear-gradient(135deg, #4FA8FF, #7B5CF0)", filter: "blur(9px)" }}
          animate={{ opacity: [0.32, 0.62, 0.32], scale: [0.88, 1.06, 0.88] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <defs>
          <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#080a14" />
            <stop offset="1" stopColor="#03040a" />
          </linearGradient>
          <linearGradient id={`${id}-right`} x1="50" y1="18" x2="74" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#DCF3FF" />
            <stop offset="0.35" stopColor="#4FA8FF" />
            <stop offset="1" stopColor="#1E4FD0" />
          </linearGradient>
          <linearGradient id={`${id}-leftInner`} x1="50" y1="18" x2="38" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B8E8FF" />
            <stop offset="0.55" stopColor="#5B8CFF" />
            <stop offset="1" stopColor="#B24FE0" />
          </linearGradient>
          <linearGradient id={`${id}-leftOuter`} x1="30" y1="30" x2="18" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#141B33" />
            <stop offset="1" stopColor="#05060B" />
          </linearGradient>
          <linearGradient id={`${id}-swoosh`} x1="46" y1="66" x2="58" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#BFE8FF" />
            <stop offset="1" stopColor="#3D7CF0" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill={`url(#${id}-tile)`} />
        <motion.g
          animate={glow ? { opacity: [0.42, 0.78, 0.42] } : undefined}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: "blur(3.5px)" }}
        >
          <path d="M50,18 L84,86 L64,86 L43,20 Z" fill="#4FA8FF" />
          <path d="M50,18 L57,20 L38,60 L27,58 Z" fill="#7B8CFF" />
          <path d="M46,66 C50,68 54,70 57,74 C55,79 52,83 47,86 C44,80 44,72 46,66 Z" fill="#5B9CFF" />
        </motion.g>
        <path d="M27,58 L38,60 L18,86 L12,84 Z" fill={`url(#${id}-leftOuter)`} />
        <path d="M50,18 L57,20 L38,60 L27,58 Z" fill={`url(#${id}-leftInner)`} />
        <path d="M50,18 L84,86 L64,86 L43,20 Z" fill={`url(#${id}-right)`} />
        <path d="M46,66 C50,68 54,70 57,74 C55,79 52,83 47,86 C44,80 44,72 46,66 Z" fill={`url(#${id}-swoosh)`} />
        <path
          d="M50,18 L57,20 L38,60 L27,58 Z M50,18 L84,86 M27,58 L12,84"
          stroke="#EAF6FF"
          strokeWidth="0.9"
          strokeOpacity="0.65"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
