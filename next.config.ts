import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  ...(isStaticExport
    ? { images: { unoptimized: true } }
    : { cacheComponents: true, partialPrefetching: true }),
};

export default nextConfig;
