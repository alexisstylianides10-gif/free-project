import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "Alxioum — AI that doesn't just answer. It acts.",
  description:
    "Alxioum is an AI-powered personal assistant that turns natural-language requests into real actions across your digital life.",
  metadataBase: new URL("https://alxioum.com"),
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alxioum",
  },
  openGraph: {
    title: "Alxioum — AI that doesn't just answer. It acts.",
    description:
      "Alxioum turns conversations into actions across your digital life. Join the waitlist.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafe" },
    { media: "(prefers-color-scheme: dark)", color: "#07070a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
