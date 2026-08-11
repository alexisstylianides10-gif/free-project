export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center">
        <span className="text-[13px] font-semibold tracking-[0.14em] text-white/80">ALXIOUM</span>
        <p className="text-[12.5px] text-white/30">Your AI. Your life. One conversation.</p>
        <p className="mt-4 text-[11px] text-white/15">© {new Date().getFullYear()} Alxioum. All rights reserved.</p>
      </div>
    </footer>
  );
}
