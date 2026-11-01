import type { NextConfig } from "next";
import path from "path";

const isStaticExport = process.env.NEXT_PUBLIC_OUTPUT === "export" || process.env.GITHUB_PAGES === "true";
const isGhPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  devIndicators: false,
  basePath: isGhPages ? "/WowCars" : undefined,
  trailingSlash: isGhPages,
  images: {
    unoptimized: isStaticExport,
  },
};

export default nextConfig;
