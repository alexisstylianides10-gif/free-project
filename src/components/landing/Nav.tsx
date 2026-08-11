"use client";

import { WaitlistDialog } from "./WaitlistDialog";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-[#05050a]/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9f8cff] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9f8cff]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.14em] text-white">ALXIOUM</span>
        </a>
        <WaitlistDialog>
          <button className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/90 transition-colors hover:border-white/30 hover:bg-white/[0.06]">
            Join Waitlist
          </button>
        </WaitlistDialog>
      </div>
    </header>
  );
}
