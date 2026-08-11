// Alxioum ships real server-side API routes (/api/chat, /api/tools/resolve)
// that call Claude and Supabase with a per-request user token — these can
// only run on a Node server, so this always builds in standard server mode
// (`next start`). Railway is the deployment target; static export
// (GitHub Pages/Netlify) is not supported once API routes exist.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
