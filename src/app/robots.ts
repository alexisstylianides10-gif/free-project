import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/branding";

/**
 * Next.js App Router metadata-route convention — this file is compiled into
 * the real `/robots.txt` endpoint at build time, not a static file in
 * `public/`. Disallows the entire authenticated app shell (`/app/**`) and
 * API routes (nothing there has any SEO value and both require auth), and
 * points crawlers at the generated sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
