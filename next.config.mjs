const isGithubPages = process.env.GITHUB_PAGES === "true";
// Netlify sets NETLIFY=true automatically during its builds.
const isNetlify = process.env.NETLIFY === "true";
const isStaticExport = isGithubPages || isNetlify;
const repoName = "free-project";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export is only needed for GitHub Pages / Netlify, which serve a
  // prebuilt `out/` directory with no Node server behind it. Everywhere else
  // (Railway, local `next start`) runs a real Next.js server, so it's left
  // undefined there and `next start` works normally.
  ...(isStaticExport ? { output: "export" } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : "",
  env: {
    // Mirrors basePath above so client code (which can't read next.config.mjs
    // directly) can build correct absolute redirect URLs for Supabase auth.
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? `/${repoName}` : "",
  },
};

export default nextConfig;
