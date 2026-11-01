import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "out");
const remoteUrl = "https://github.com/traderdev777/WowCars.git";

console.log("==================================================================");
console.log("  WOWCARS — DEPLOYING TO GITHUB PAGES (gh-pages BRANCH)           ");
console.log("==================================================================");

if (!fs.existsSync(outDir) || !fs.existsSync(path.join(outDir, "index.html"))) {
  console.log("⚙️  Running npm run build:pages to generate static export...");
  execSync("npm run build:pages", { cwd: rootDir, stdio: "inherit" });
}

const gitDir = path.join(outDir, ".git");
if (fs.existsSync(gitDir)) {
  fs.rmSync(gitDir, { recursive: true, force: true });
}

console.log("📦 Initializing temporary git repo in ./out ...");
execSync("git init", { cwd: outDir, stdio: "inherit" });
execSync('git config user.email "contact@wowcars.in"', { cwd: outDir, stdio: "inherit" });
execSync('git config user.name "WowCars Team"', { cwd: outDir, stdio: "inherit" });
execSync("git config http.postBuffer 524288000", { cwd: outDir, stdio: "inherit" });
execSync("git config http.version HTTP/1.1", { cwd: outDir, stdio: "inherit" });
execSync("git add -A", { cwd: outDir, stdio: "inherit" });
execSync('git commit -m "deploy: publish WowCars to GitHub Pages [skip ci]"', {
  cwd: outDir,
  stdio: "inherit",
});
execSync("git branch -M gh-pages", { cwd: outDir, stdio: "inherit" });
execSync(`git remote add origin ${remoteUrl}`, { cwd: outDir, stdio: "inherit" });

console.log(`🚀 Force pushing gh-pages branch to ${remoteUrl} ...`);
execSync("git push -f origin gh-pages", { cwd: outDir, stdio: "inherit" });

// Clean up .git inside out
fs.rmSync(gitDir, { recursive: true, force: true });

console.log("🎉 Successfully deployed to gh-pages branch!");
console.log("🌐 GitHub Pages URL: https://traderdev777.github.io/WowCars/");
