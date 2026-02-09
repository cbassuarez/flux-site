export type ChangelogItem = {
  id: number;
  title: string;
  summary?: string;
  mergedAt: string;
  url: string;
  diffUrl: string;
  author: string;
  labels: string[];
  area?: string;
  channel: "stable" | "canary";
  breaking?: boolean;
};

export type ChangelogResponse = {
  generatedAt: string;
  source: { repo: string; branch: string };
  items: ChangelogItem[];
  nextCursor?: string;
};

const DEFAULT_TIMEOUT_MS = 8000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number" && !Number.isNaN(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isChannel = (value: unknown): value is "stable" | "canary" => value === "stable" || value === "canary";

const isChangelogItem = (value: unknown): value is ChangelogItem => {
  if (!isObject(value)) return false;
  return (
    isNumber(value.id) &&
    isString(value.title) &&
    isString(value.mergedAt) &&
    isString(value.url) &&
    isString(value.diffUrl) &&
    isString(value.author) &&
    isStringArray(value.labels) &&
    isChannel(value.channel) &&
    (value.summary === undefined || value.summary === null || isString(value.summary)) &&
    (value.area === undefined || value.area === null || isString(value.area)) &&
    (value.breaking === undefined || typeof value.breaking === "boolean")
  );
};

const parseChangelogResponse = (payload: unknown): ChangelogResponse => {
  if (!isObject(payload)) {
    throw new Error("Invalid changelog response");
  }
  if (!isString(payload.generatedAt) || !isObject(payload.source)) {
    throw new Error("Invalid changelog response");
  }
  if (!isString(payload.source.repo) || !isString(payload.source.branch)) {
    throw new Error("Invalid changelog response");
  }
  if (!Array.isArray(payload.items)) {
    throw new Error("Invalid changelog response");
  }
  const items = payload.items.filter(isChangelogItem);
  if (items.length !== payload.items.length) {
    throw new Error("Invalid changelog response");
  }
  const response: ChangelogResponse = {
    generatedAt: payload.generatedAt,
    source: { repo: payload.source.repo, branch: payload.source.branch },
    items: items.map((item) => ({
      ...item,
      summary: item.summary ?? undefined,
      area: item.area ?? undefined,
      breaking: item.breaking ?? undefined,
    })),
  };
  if (isString(payload.nextCursor)) {
    response.nextCursor = payload.nextCursor;
  }
  return response;
};

const buildUrl = (base: string, params: { window?: string; limit?: number; cursor?: string }) => {
  const url = new URL("/changelog", base);
  if (params.window) url.searchParams.set("window", params.window);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  return url.toString();
};

export async function fetchChangelog(
  params: { window?: string; limit?: number; cursor?: string; timeoutMs?: number },
  signal?: AbortSignal
): Promise<ChangelogResponse> {
  const baseUrl = import.meta.env.VITE_CHANGELOG_API as string | undefined;
  if (!baseUrl) {
    throw new Error("Changelog service is not configured.");
  }

  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(baseUrl, params), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const detail = text ? ` ${text}` : "";
      throw new Error(`Failed to load changelog.${detail}`.trim());
    }

    const payload = (await response.json()) as unknown;
    return parseChangelogResponse(payload);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Changelog request timed out.");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to load changelog.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}
