import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alxioum-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Alxioum — AI that doesn't just answer. It acts.", template: "%s · Alxioum" },
  description:
    "Alxioum turns natural-language requests into real actions across your calendar, tasks, and memory — with your permission at every step.",
  manifest: "/manifest.json",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Alxioum" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFE" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F1A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
