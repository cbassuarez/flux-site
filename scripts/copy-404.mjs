import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfigFromFile } from "vite";

async function loadViteConfig() {
  const configFile = resolve(process.cwd(), "vite.config.ts");
  const result = await loadConfigFromFile({ command: "build", mode: "production" }, configFile);
  return result?.config ?? {};
}

async function main() {
  const viteConfig = await loadViteConfig();
  const outDir = viteConfig.build?.outDir ?? "dist";

  const indexPath = resolve(process.cwd(), outDir, "index.html");
  const notFoundPath = resolve(process.cwd(), outDir, "404.html");

  let html;
  try {
    html = await readFile(indexPath, "utf8");
  } catch (err) {
    console.error(`[copy-404] Failed to read ${indexPath}`);
    throw err;
  }

  await writeFile(notFoundPath, html, "utf8");
  console.log(`[copy-404] Wrote ${notFoundPath} (SPA fallback)`);
}

main().catch((err) => {
  console.error("[copy-404] Error:", err);
  process.exitCode = 1;
});
