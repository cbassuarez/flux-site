import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServer } from "node:net";
import { chromium } from "@playwright/test";

const PREVIEW_HOST = "127.0.0.1";
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

async function getAvailablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.on("error", rejectPort);
    server.listen(0, PREVIEW_HOST, () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) {
        const port = address.port;
        server.close(() => resolvePort(port));
      } else {
        server.close(() => rejectPort(new Error("[prerender] Unable to resolve preview port")));
      }
    });
  });
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[prerender] ${command} ${args.join(" ")} failed (${code})`));
    });
  });
}

async function ensureChromiumInstalled() {
  console.log("[prerender] Ensuring Playwright Chromium is installed...");
  await runCommand("npx", ["playwright", "install", "--with-deps", "chromium"]);
}

async function writeHtml(route, html) {
  const pathSuffix = route === "/" ? "/index.html" : `${route}/index.html`;
  const outPath = resolve(process.cwd(), "dist", `.${pathSuffix}`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
}

async function main() {
  const previewPort = await getAvailablePort();
  const previewUrl = `http://${PREVIEW_HOST}:${previewPort}`;
  console.log("[prerender] Starting preview server...");
  const server = spawn(
    "npm",
    ["run", "preview", "--", "--strictPort", "--port", `${previewPort}`, "--host", PREVIEW_HOST],
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
    await waitForServer(previewUrl);
    console.log("[prerender] Preview server ready.");
    await ensureChromiumInstalled();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__PRERENDER__ = true;
    });

    for (const route of ROUTES) {
      const url = `${previewUrl}${route}`;
      console.log(`[prerender] Rendering ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector('meta[property="og:title"]', { timeout: 10000, state: "attached" });
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
