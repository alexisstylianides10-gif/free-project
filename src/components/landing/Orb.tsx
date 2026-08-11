"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Orb({ size = 320, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* outer atmosphere */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,109,255,0.35) 0%, rgba(124,109,255,0.08) 45%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* rotating ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: "8%",
          background:
            "conic-gradient(from 0deg, rgba(124,109,255,0) 0deg, rgba(159,140,255,0.55) 90deg, rgba(124,109,255,0) 180deg, rgba(94,234,212,0.35) 270deg, rgba(124,109,255,0) 360deg)",
          borderRadius: "9999px",
          maskImage: "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 70%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* core */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: "48%",
          height: "48%",
          background:
            "radial-gradient(circle at 35% 30%, #ffffff 0%, #b9aeff 18%, #7c6dff 42%, #3d2f9e 72%, #1a1440 100%)",
          boxShadow: "0 0 60px 10px rgba(124,109,255,0.45), 0 0 120px 40px rgba(124,109,255,0.18)",
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* orbiting particle */}
      <motion.div
        className="absolute"
        style={{ width: "100%", height: "100%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute left-1/2 top-[6%] h-2 w-2 -translate-x-1/2 rounded-full bg-white"
          style={{ boxShadow: "0 0 12px 4px rgba(255,255,255,0.8)" }}
        />
      </motion.div>
    </div>
  );
}
