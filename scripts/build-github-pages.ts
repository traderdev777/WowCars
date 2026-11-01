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
