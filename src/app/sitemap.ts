import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/branding";

/**
 * Next.js App Router metadata-route convention — compiled into the real
 * `/sitemap.xml` endpoint at build time. Only public, unauthenticated
 * marketing/auth routes belong here: everything under `/app/**` requires a
 * signed-in session and has zero value being indexed, and API routes aren't
 * pages at all. `/onboarding` is deliberately excluded too — it's only ever
 * reached mid-signup for an authenticated-but-incomplete user, not a page a
 * search engine should ever land someone on directly.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/features", priority: 0.8, changeFrequency: "monthly" },
    { path: "/choose-plan", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "yearly" },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
