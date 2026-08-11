const isGithubPages = process.env.GITHUB_PAGES === "true";
// Railway (and any other real Node host) runs `next start` against a server
// build, which is incompatible with `output: "export"`. Only static hosts
// (GitHub Pages, Netlify) need the exported "out" directory.
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
const repoName = "free-project";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isRailway ? {} : { output: "export" }),
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : "",
};

export default nextConfig;
