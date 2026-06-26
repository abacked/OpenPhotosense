const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isGithubPages
    ? {
        output: "export",
        trailingSlash: true,
        basePath: "/OpenPhotosense",
        assetPrefix: "/OpenPhotosense/",
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
