/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the desktop app (Tauri) serves these files locally, fully offline.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Engine-heavy pages are client components; there is no server at runtime.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
