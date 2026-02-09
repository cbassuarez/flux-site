import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".css",
  ".map",
  ".json",
  ".xml",
  ".txt",
]);

const PRIVATE_NET_REGEX = /localhost|127\.0\.0\.1|0\.0\.0\.0|\b192\.168\.|\b10\.|\b172\.(1[6-9]|2\d|3[0-1])\./g;

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function getSnippets(content, maxSnippets = 3, radius = 60) {
  const snippets = [];
  for (const match of content.matchAll(PRIVATE_NET_REGEX)) {
    const start = Math.max(0, match.index - radius);
    const end = Math.min(content.length, match.index + match[0].length + radius);
    const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();
    snippets.push(snippet);
    if (snippets.length >= maxSnippets) break;
  }
  return snippets;
}

async function checkDist() {
  const distPath = join(process.cwd(), "dist");
  const distStats = await stat(distPath).catch(() => null);
  if (!distStats?.isDirectory()) {
    console.error("[check-dist] dist/ directory not found. Run the build first.");
    process.exit(1);
  }

  const allFiles = await collectFiles(distPath);
  const matches = [];

  for (const filePath of allFiles) {
    const ext = filePath.slice(filePath.lastIndexOf("."));
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    const content = await readFile(filePath, "utf8");
    PRIVATE_NET_REGEX.lastIndex = 0;
    if (PRIVATE_NET_REGEX.test(content)) {
      const snippets = getSnippets(content);
      matches.push({
        filePath: relative(process.cwd(), filePath),
        snippets,
      });
    }
  }

  if (matches.length > 0) {
    console.error("[check-dist] Found private network references in dist:");
    for (const match of matches) {
      console.error(`- ${match.filePath}`);
      for (const snippet of match.snippets) {
        console.error(`  • ${snippet}`);
      }
    }
    process.exit(1);
  }

  console.log("[check-dist] dist/ is free of private network references.");
}

await checkDist();
