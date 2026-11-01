/**
 * Universal static asset path resolver for WowCars.
 * Automatically handles basePath when running under GitHub Pages (/WowCars)
 * while preserving standard root paths for local dev and production standalone.
 */
export function getAssetPath(src: string): string {
  if (!src) return src;
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (typeof window !== "undefined" && window.location.pathname.startsWith("/WowCars") ? "/WowCars" : "");
  const cleanSrc = src.startsWith("/") ? src : `/${src}`;

  if (basePath && !cleanSrc.startsWith(basePath)) {
    return `${basePath}${cleanSrc}`;
  }

  return cleanSrc;
}
