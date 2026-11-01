import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = path.resolve(__dirname, "..");
const apiDir = path.join(rootDir, "src", "app", "api");
const backupApiDir = path.join(rootDir, ".api_routes_temp_backup");
const outDir = path.join(rootDir, "out");

console.log("==================================================================");
console.log("  WOWCARS — GITHUB PAGES STATIC EXPORT BUILD PIPELINE             ");
console.log("==================================================================");

let moved = false;

try {
  if (fs.existsSync(apiDir)) {
    console.log("📦 Stashing dynamic Node.js Route Handlers (/api) for static build...");
    fs.renameSync(apiDir, backupApiDir);
    moved = true;
  }

  console.log("🚀 Running Next.js static export with basePath: /WowCars ...");
  execSync("npx next build", {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      NEXT_PUBLIC_OUTPUT: "export",
      NEXT_PUBLIC_BASE_PATH: "/WowCars",
    },
  });

  console.log("✅ Next.js static export generated successfully!");

  // Ensure .nojekyll exists
  const nojekyllPath = path.join(outDir, ".nojekyll");
  fs.writeFileSync(nojekyllPath, "");
  console.log("📄 Added .nojekyll file to out/ for GitHub Pages asset resolution");

  // Ensure 404.html exists for client-side routing on GitHub Pages
  const notFoundHtml = path.join(outDir, "404.html");
  const notFoundDirHtml = path.join(outDir, "_not-found", "index.html");
  if (!fs.existsSync(notFoundHtml) && fs.existsSync(notFoundDirHtml)) {
    fs.copyFileSync(notFoundDirHtml, notFoundHtml);
    console.log("📄 Created out/404.html from _not-found");
  }

  // Rewrite un-prefixed asset references in all HTML, JS, JSON, and CSS files
  console.log("🔧 Rewriting static asset paths to include /WowCars prefix...");
  const assetRegex = /(["'\(])\/(?!(?:WowCars\/|_next\/|api\/|http:\/\/|https:\/\/|data:|#))((?:images|videos|parts|demo|uploads|wowcars-logo(?:-light)?\.(?:png|jpg)|favicon\.ico|manifest\.json)[^"'\)]*)/g;

  function processDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== ".git") {
          processDirectory(fullPath);
        }
      } else if (/\.(html|js|json|css|txt)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (assetRegex.test(content)) {
          const updated = content.replace(assetRegex, "$1/WowCars/$2");
          fs.writeFileSync(fullPath, updated, "utf-8");
        }
      }
    }
  }

  processDirectory(outDir);
  console.log("✅ Asset path rewriting completed across all output files.");

  // Mirror static folders under out/WowCars for 100% fail-safe path resolution
  const wowCarsSubDir = path.join(outDir, "WowCars");
  if (!fs.existsSync(wowCarsSubDir)) {
    fs.mkdirSync(wowCarsSubDir, { recursive: true });
  }

  const staticAssetItems = [
    "wowcars-logo.png",
    "wowcars-logo.jpg",
    "wowcars-logo-light.png",
    "wowcars-logo-light.jpg",
    "favicon.ico",
    "manifest.json",
    "images",
    "videos",
    "parts",
    "uploads",
  ];

  for (const item of staticAssetItems) {
    const src = path.join(outDir, item);
    const dest = path.join(wowCarsSubDir, item);
    if (fs.existsSync(src)) {
      if (fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
      console.log(`📁 Mirrored ${item} to out/WowCars/${item}`);
    }
  }

  console.log("🎉 GitHub Pages static build complete in ./out!");
} catch (error) {
  console.error("❌ GitHub Pages static build failed:", error);
  process.exitCode = 1;
} finally {
  if (moved && fs.existsSync(backupApiDir)) {
    console.log("🔄 Restoring dynamic Route Handlers (/api)...");
    fs.renameSync(backupApiDir, apiDir);
    console.log("✅ Route Handlers restored.");
  }
}
