const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();

// Verified against actual app needs, not a generic template: next/font/google
// self-hosts fonts at build time (no external font origin needed), no Google
// avatar images are used, no Supabase realtime/websocket calls exist, the
// custom checkout form loads Stripe.js and its Payment Element (card fields
// render inside a Stripe-hosted iframe for PCI compliance, and a 3-D Secure
// challenge — when a card requires it — opens in one too), and
// public/sw.js is the one service worker (push notifications).
// Next.js dev mode's Fast Refresh runtime evaluates code via eval() — without
// 'unsafe-eval' the browser throws before React ever hydrates, and every
// page silently renders blank (the DOM is there, but framer-motion's
// initial opacity:0 never animates in because the client bundle threw).
// Production output never uses eval, so the stricter policy only applies
// there.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  `connect-src 'self' https://api.stripe.com${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
