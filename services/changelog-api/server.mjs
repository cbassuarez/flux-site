import http from "node:http";

const CACHE_TTL_MS = 60_000;
const cache = new Map();
const REQUIRED_ORIGINS = ["https://fluxspec.org", "https://cbassuarez.github.io"];

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const missingOrigins = REQUIRED_ORIGINS.filter((origin) => !allowedOrigins.includes(origin));
if (missingOrigins.length > 0) {
  console.warn(
    "ALLOWED_ORIGINS is missing required origins:",
    missingOrigins.join(", ")
  );
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function parseWindowParam(value) {
  if (!value) return 30;
  const match = value.trim().match(/^(\d+)\s*d?$/i);
  if (!match) return 30;
  const days = Number(match[1]);
  if (Number.isNaN(days)) return 30;
  return Math.min(Math.max(days, 1), 365);
}

function parseLimitParam(value) {
  if (!value) return 20;
  const count = Number(value);
  if (Number.isNaN(count)) return 20;
  return Math.min(Math.max(count, 1), 50);
}

function cacheKey(windowDays, limit, cursor) {
  return `${windowDays}|${limit}|${cursor ?? ""}`;
}

function getCacheEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCacheEntry(key, payload) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

function toDateString(daysAgo) {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function extractSummary(bodyText) {
  if (!bodyText) return undefined;
  const lines = bodyText.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*release notes?\s*:\s*(.+)$/i);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value) return value;
    }
  }

  const headingRegex = /^(#{1,6})\s*release notes?\s*$/i;
  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(headingRegex);
    if (!headingMatch) continue;
    const headingLevel = headingMatch[1].length;
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      const nextHeading = line.match(/^(#{1,6})\s+/);
      if (nextHeading && nextHeading[1].length <= headingLevel) break;
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cleaned = trimmed.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();
      if (cleaned) return cleaned;
    }
    break;
  }

  return undefined;
}

function deriveArea(labels) {
  for (const label of labels) {
    const match = label.match(/^area:\s*(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function isBreaking(labels) {
  const breakingLabels = new Set(["breaking", "semver-major", "breaking-change"]);
  return labels.some((label) => breakingLabels.has(label.toLowerCase()));
}

async function fetchGitHub(token, query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body: text };
  }

  const json = JSON.parse(text);
  if (json.errors?.length) {
    return { ok: false, status: 502, body: JSON.stringify({ errors: json.errors }) };
  }

  return { ok: true, status: response.status, body: json.data };
}

async function buildChangelog({ windowDays, limit, cursor, token }) {
  const mergedSince = toDateString(windowDays);
  const queryString = `repo:cbassuarez/flux is:pr is:merged label:changelog base:main merged:>=${mergedSince}`;
  const graphQuery = `
    query Changelog($query: String!, $first: Int!, $after: String) {
      search(type: ISSUE, query: $query, first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          ... on PullRequest {
            number
            title
            url
            mergedAt
            baseRefName
            bodyText
            author { login }
            labels(first: 50) { nodes { name } }
          }
        }
      }
    }
  `;

  const response = await fetchGitHub(token, graphQuery, {
    query: queryString,
    first: limit,
    after: cursor ?? null,
  });

  if (!response.ok) {
    return { error: "GitHub API error", status: response.status };
  }

  const data = response.body;
  const nodes = data?.search?.nodes ?? [];
  const items = nodes.map((node) => {
    const labels = node.labels?.nodes?.map((label) => label.name) ?? [];
    const area = deriveArea(labels);
    const breaking = isBreaking(labels) || undefined;
    const channel = node.baseRefName === "canary" ? "canary" : "stable";
    return {
      id: node.number,
      title: node.title,
      summary: extractSummary(node.bodyText),
      mergedAt: node.mergedAt,
      url: node.url,
      diffUrl: `${node.url}/files`,
      author: node.author?.login ?? "unknown",
      labels,
      area,
      channel,
      breaking,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    source: { repo: "cbassuarez/flux", branch: "main" },
    items,
    nextCursor: data?.search?.pageInfo?.hasNextPage ? data.search.pageInfo.endCursor : undefined,
  };
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!req.url) {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method !== "GET") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/changelog") {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      sendJson(res, 500, { error: "GITHUB_TOKEN not configured" });
      return;
    }

    const windowDays = parseWindowParam(url.searchParams.get("window") ?? undefined);
    const limit = parseLimitParam(url.searchParams.get("limit") ?? undefined);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const key = cacheKey(windowDays, limit, cursor);
    const cached = getCacheEntry(key);
    if (cached) {
      sendJson(res, 200, cached);
      return;
    }

    try {
      const payload = await buildChangelog({ windowDays, limit, cursor, token });
      if ("error" in payload) {
        sendJson(res, 502, { error: payload.error });
        return;
      }
      setCacheEntry(key, payload);
      sendJson(res, 200, payload);
    } catch (error) {
      console.error("Failed to build changelog", error);
      sendJson(res, 500, { error: "Unable to fetch changelog" });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`Changelog API listening on ${port}`);
});
