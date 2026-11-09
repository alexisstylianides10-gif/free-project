import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/game/Toaster";

export const metadata: Metadata = {
  title: "Touchline Manager",
  description: "Offline single-player football management simulator.",
};

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
