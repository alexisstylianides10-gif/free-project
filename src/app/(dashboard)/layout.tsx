import { AppShell } from "@/components/layout/AppShell";

// Every page here is a "use client" shell that fetches its own live data —
// there's nothing to gain from Next.js prerendering and long-caching the
// static HTML, and it's exactly what let a browser hang onto a stale page
// after a fix had already shipped. Forcing dynamic rendering means each
// request gets fresh HTML with normal no-cache headers.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
