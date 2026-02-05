import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  const base = viteConfig.base ?? "/";

  if (base !== "/") {
    console.log(`[copy-edit] Skipping, base is ${base}`);
    return;
  }

  const indexPath = resolve(process.cwd(), outDir, "index.html");
  const editDir = resolve(process.cwd(), outDir, "edit");
  const editIndexPath = resolve(editDir, "index.html");

  let html;
  try {
    html = await readFile(indexPath, "utf8");
  } catch (err) {
    console.error(`[copy-edit] Failed to read ${indexPath}`);
    throw err;
  }

  await mkdir(editDir, { recursive: true });
  await writeFile(editIndexPath, html, "utf8");
  console.log(`[copy-edit] Wrote ${editIndexPath}`);
}

main().catch((err) => {
  console.error("[copy-edit] Error:", err);
  process.exitCode = 1;
});
