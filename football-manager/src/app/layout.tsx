import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/game/Toaster";

export const metadata: Metadata = {
  title: "Touchline Manager",
  description: "Offline single-player football management simulator.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Touchline", statusBarStyle: "black" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070a0f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
