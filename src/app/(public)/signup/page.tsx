import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { SignupClient } from "./SignupClient";

// See login/page.tsx for why this thin server wrapper exists: `SignupClient`
// is a client component and can't export `metadata` itself, so this gives
// `/signup` its own real canonical instead of inheriting the root layout's
// `alternates.canonical: "/"`.
export const metadata: Metadata = {
  title: "Sign up",
  alternates: { canonical: `${siteUrl}/signup` },
};

export default function SignupPage() {
  return <SignupClient />;
}
