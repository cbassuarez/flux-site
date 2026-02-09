import { extractReleaseNote } from "../changelog/extractReleaseNote";
import { deriveChips, normalizeTitle } from "../changelog/normalize";
import type { ChangelogData, ChangelogItem } from "../changelog/types";

type EnvLike = Record<string, string | undefined>;

type HandlerResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type CacheEntry = {
  expiresAt: number;
  payload: HandlerResponse;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const ALLOWED_WINDOWS = new Set([7, 30, 90, 365]);

function getToken(env?: EnvLike) {
  return env?.GITHUB_TOKEN ?? env?.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
}

function clampWindowDays(value: number | null) {
  if (!value || Number.isNaN(value)) return 30;
  if (!ALLOWED_WINDOWS.has(value)) return 30;
  return Math.min(Math.max(value, 1), 365);
}

function clampFirst(value: number | null) {
  if (!value || Number.isNaN(value)) return 7;
  return Math.min(Math.max(value, 1), 50);
}

function toDateString(daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function deriveChannel(baseRefName: string) {
  if (baseRefName === "main") return "stable";
  if (baseRefName === "canary") return "canary";
  return baseRefName;
}

function buildCacheKey(base: string, windowDays: number, first: number, after: string | null) {
  return [base, windowDays, first, after ?? ""].join("|");
}

async function fetchGitHub(query: string, variables: Record<string, unknown>, token?: string) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: text,
      rateLimited: response.status === 403,
    };
  }

  const json = JSON.parse(text) as { data?: unknown; errors?: { message: string }[] };
  const rateLimited = Boolean(
    json.errors?.some((error) => error.message.toLowerCase().includes("rate limit"))
  );

  if (json.errors && json.errors.length > 0) {
    return {
      ok: false,
      status: 503,
      body: JSON.stringify({ errors: json.errors }),
      rateLimited,
    };
  }

  return { ok: true, status: 200, body: json.data, rateLimited } as const;
}

export async function handleChangelogRequest(url: URL, env?: EnvLike): Promise<HandlerResponse> {
  const base = url.searchParams.get("base") ?? "main";
  const windowDays = clampWindowDays(Number(url.searchParams.get("windowDays")));
  const first = clampFirst(Number(url.searchParams.get("first")));
  const after = url.searchParams.get("after") || null;
  const cb = url.searchParams.get("cb");
  const cacheKey = buildCacheKey(base, windowDays, first, after);
  const now = Date.now();

  if (!cb) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.payload;
    }
  }

  const mergedSince = toDateString(windowDays);
  const queryString = `repo:flux-lang/flux is:pr is:merged label:changelog merged:>=${mergedSince} base:${base}`;

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
            author { login url }
            labels(first: 20) { nodes { name } }
          }
        }
      }
    }
  `;

  const token = getToken(env);
  const response = await fetchGitHub(graphQuery, { query: queryString, first, after }, token);

  if (!response.ok) {
    const retryAfter = response.rateLimited ? 60 : 30;
    const errorBody = JSON.stringify({
      error: "Changelog unavailable",
      rateLimited: response.rateLimited,
      retryAfter,
    });
    return {
      status: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
      body: errorBody,
    };
  }

  const data = response.body as {
    search: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        number: number;
        title: string;
        url: string;
        mergedAt: string;
        baseRefName: string;
        bodyText: string | null;
        author: { login: string; url: string } | null;
        labels: { nodes: Array<{ name: string }> };
      }>;
    };
  };

  const items: ChangelogItem[] = (data.search.nodes ?? []).map((node) => {
    const labels = node.labels?.nodes?.map((label) => label.name) ?? [];
    const normalized = normalizeTitle(node.title);
    const channel = deriveChannel(node.baseRefName);
    const chips = deriveChips({
      title: normalized.title,
      typeChip: normalized.typeChip,
      scopeChip: normalized.scopeChip,
      channel,
    });
    return {
      id: node.number,
      title: normalized.title,
      rawTitle: node.title,
      summary: extractReleaseNote(node.bodyText),
      mergedAt: node.mergedAt,
      url: node.url,
      diffUrl: `${node.url}/files`,
      author: node.author ? { login: node.author.login, url: node.author.url } : null,
      labels,
      chips,
    };
  });

  const payload: ChangelogData = {
    generatedAt: new Date().toISOString(),
    source: {
      repo: "flux-lang/flux",
      base,
      windowDays,
    },
    pageInfo: {
      hasNextPage: data.search.pageInfo.hasNextPage,
      endCursor: data.search.pageInfo.endCursor,
    },
    items,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": cb
      ? "no-store"
      : "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
  };

  const responsePayload: HandlerResponse = {
    status: 200,
    headers,
    body,
  };

  if (!cb) {
    cache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      payload: responsePayload,
    });
  }

  return responsePayload;
}
