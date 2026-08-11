"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "./Container";

const links = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Architecture", href: "#architecture" },
  { label: "Privacy", href: "#privacy" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300 " +
        (scrolled ? "border-b border-white/10 bg-[#08080c]/80 backdrop-blur-lg" : "border-b border-transparent")
      }
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="#top" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-indigo-400 to-violet-500">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.1" fill="white" />
              <circle cx="8" cy="8" r="6.2" stroke="white" strokeWidth="1.15" strokeOpacity="0.6" fill="none" />
              <circle cx="13.4" cy="8" r="1.1" fill="white" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">ALXIOUM</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] font-medium text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="hidden text-[13.5px] font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <a
            href="#waitlist"
            className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
          >
            Join the Waitlist
          </a>
        </div>
      </Container>
    </motion.header>
  );
}
