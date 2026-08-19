import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { branding } from "@/lib/branding";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://futureos.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${branding.name} — ${branding.tagline}`, template: `%s · ${branding.name}` },
  description: branding.description,
  manifest: "/manifest.json",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: branding.name },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: branding.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="antialiased">
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
