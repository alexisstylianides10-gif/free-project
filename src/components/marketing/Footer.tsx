import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-gradient-to-br from-brand-400 to-brand-600">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.1" fill="white" />
              <circle cx="8" cy="8" r="6.2" stroke="white" strokeWidth="1.15" strokeOpacity="0.6" fill="none" />
              <circle cx="13.4" cy="8" r="1.1" fill="white" />
            </svg>
          </span>
          <span className="text-[13.5px] font-semibold tracking-tight text-paper/70">ALXIOUM</span>
        </div>

        <p className="text-[12.5px] text-paper/35">© {new Date().getFullYear()} Alxioum. All rights reserved.</p>

        <Link href="/app" className="text-[12.5px] font-medium text-paper/40 transition-colors hover:text-paper/70">
          Sign in
        </Link>
      </Container>
    </footer>
  );
}
