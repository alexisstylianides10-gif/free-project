"use client";

import { AnimatePresence, motion } from "framer-motion";

const BLOBS = [
  { size: 480, top: "-15%", left: "-10%", from: "hsl(var(--accent))", duration: 7, delay: 0 },
  { size: 420, top: "40%", left: "70%", from: "hsl(var(--accent-end))", duration: 8.5, delay: 0.6 },
  { size: 380, top: "75%", left: "10%", from: "hsl(var(--accent))", duration: 9.5, delay: 1.2 },
];

/** Ambient full-panel glow shown behind the chat while voice input is listening. */
export function ListeningAurora({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl"
        >
          {BLOBS.map((blob, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: blob.size,
                height: blob.size,
                top: blob.top,
                left: blob.left,
                background: `radial-gradient(circle, ${blob.from} 0%, transparent 70%)`,
              }}
              initial={{ opacity: 0.14, scale: 0.9 }}
              animate={{ opacity: [0.12, 0.26, 0.12], scale: [0.9, 1.15, 0.9], x: [0, 24, 0], y: [0, -18, 0] }}
              transition={{ duration: blob.duration, delay: blob.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(120% 100% at 50% 100%, hsl(var(--accent) / 0.08), transparent 60%)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
