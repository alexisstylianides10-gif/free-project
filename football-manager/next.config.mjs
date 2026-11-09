/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the desktop app (Tauri) serves these files locally, fully offline.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // ESLint is not configured for this package (strict TypeScript is the static check).
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
