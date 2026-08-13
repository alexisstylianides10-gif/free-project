"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/** Small mount-in fade/rise, optionally staggered by index — for list items
 * and cards that appear as soon as their page's data has loaded. */
export function FadeIn({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
