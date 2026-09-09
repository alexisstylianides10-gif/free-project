"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Next.js only calls this when the ROOT LAYOUT itself throws during render
 * (a provider crashing before the app tree ever mounts) — the ordinary
 * error.tsx boundary can't catch that case at all, since error.tsx renders
 * inside the layout it's meant to protect against. Without this file, that
 * rare failure falls through to Next's raw, unstyled default error screen
 * instead of anything on-brand. Must render its own <html>/<body> (it
 * replaces the entire root layout) and can't rely on any of this app's own
 * providers/context — kept deliberately plain and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main
          style={{
            display: "flex",
            minHeight: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 2rem",
            textAlign: "center",
            background: "#0b0b10",
            color: "#f5f5f7",
          }}
        >
          <div style={{ maxWidth: 320 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Something went wrong</h1>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#a1a1aa" }}>
              That&rsquo;s on us. Try reloading the page, and if it keeps happening, come back in a little while.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={reset}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  background: "#f5f5f7",
                  color: "#0b0b10",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the whole root layout, so the app router/next/link context it needs isn't guaranteed to be mounted here. */}
              <a href="/" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f5f5f7", textDecoration: "underline" }}>
                Back to home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
