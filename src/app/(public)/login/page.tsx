import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { LoginClient } from "./LoginClient";

// `LoginClient` is a client component (form state, Supabase auth calls) and
// can't co-locate a `metadata` export in the same file in this Next.js
// version — App Router `metadata` must come from a server component. This
// thin server `page.tsx` gives `/login` its own real `<link rel="canonical">`
// instead of silently inheriting the root layout's `alternates.canonical: "/"`
// (which previously made `/login` render a canonical pointing at the bare
// homepage, contradicting the sitemap that lists `/login` as its own
// indexable page).
export const metadata: Metadata = {
  title: "Log in",
  alternates: { canonical: `${siteUrl}/login` },
};

export default function LoginPage() {
  return <LoginClient />;
}
