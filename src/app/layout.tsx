import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LocaleBridge } from "@/components/providers/LocaleBridge";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ThemeProvider, themeInitScript } from "@/components/providers/ThemeProvider";
import { branding, siteUrl } from "@/lib/branding";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Reused as the OG/Twitter share image — there's no dedicated 1200x630 OG
// asset in this project yet, and inventing a path to an image that doesn't
// exist would just produce a broken share-card image. `icon-512.png` is a
// real, existing, on-brand square asset (already shipped for the PWA
// manifest) that at least renders something correct on share; swap for a
// purpose-made OG image later if/when one exists.
const ogImage = "/icons/icon-512.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${branding.name} · ${branding.tagline}`, template: `%s · ${branding.name}` },
  description: branding.description,
  manifest: "/manifest.json",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: branding.name },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: branding.name,
    title: `${branding.name} · ${branding.tagline}`,
    description: branding.description,
    images: [{ url: ogImage, width: 512, height: 512, alt: `${branding.name} logo` }],
  },
  twitter: {
    card: "summary",
    title: `${branding.name} · ${branding.tagline}`,
    description: branding.description,
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: branding.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `lang` starts as "en" and is corrected client-side by LocaleProvider
  // once the real locale resolves — see that file's top comment for why
  // this app resolves locale entirely client-side (no cookies()/getLocale()
  // call here) rather than the more "obvious" server-resolved approach:
  // that would force every route through this layout to render dynamically
  // instead of prerendering, a real regression for this app's static
  // marketing pages, for zero benefit while Phase 1 doesn't translate any
  // UI copy yet.
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <LocaleProvider>
          <ThemeProvider>
            <ServiceWorkerRegister />
            <AuthProvider>
              <LocaleBridge />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
