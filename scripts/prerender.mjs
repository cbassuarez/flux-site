import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const ROUTES = [
  "/",
  "/docs/get-started",
  "/docs/language-overview",
  "/docs/syntax",
  "/docs/render-html",
  "/docs/viewer",
  "/docs/changelog",
];

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return;
    } catch (error) {
      // retry
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`[prerender] Preview server did not respond within ${timeoutMs}ms`);
}

async function writeHtml(route, html) {
  const pathSuffix = route === "/" ? "/index.html" : `${route}/index.html`;
  const outPath = resolve(process.cwd(), "dist", `.${pathSuffix}`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
}

async function main() {
  console.log("[prerender] Starting preview server...");
  const server = spawn(
    "npm",
    ["run", "preview", "--", "--strictPort", "--port", `${PREVIEW_PORT}`, "--host", "127.0.0.1"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    },
  );

  const cleanup = () =>
    new Promise((resolveCleanup) => {
      if (server.killed) {
        resolveCleanup();
        return;
      }
      server.once("exit", () => resolveCleanup());
      server.kill("SIGTERM");
      setTimeout(() => {
        if (!server.killed) server.kill("SIGKILL");
      }, 2000);
    });

  try {
    await waitForServer(PREVIEW_URL);
    console.log("[prerender] Preview server ready.");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__PRERENDER__ = true;
    });

    for (const route of ROUTES) {
      const url = `${PREVIEW_URL}${route}`;
      console.log(`[prerender] Rendering ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector('meta[property="og:title"]', { timeout: 10000 });
      const html = await page.content();
      await writeHtml(route, html);
    }

    await browser.close();
  } catch (error) {
    console.error("[prerender] Failed:", error);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

await main();
