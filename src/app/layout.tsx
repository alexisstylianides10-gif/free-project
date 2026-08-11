import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alxioum — Your life. One AI.",
  description:
    "Alxioum is the AI that turns what you say into what gets done. Forget jumping between calendars, task apps, reminders, and endless menus — just tell Alxioum what you need.",
  openGraph: {
    title: "Alxioum — Your life. One AI.",
    description: "The AI that turns what you say into what gets done.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05050a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#05050a] text-white antialiased">{children}</body>
    </html>
  );
}
