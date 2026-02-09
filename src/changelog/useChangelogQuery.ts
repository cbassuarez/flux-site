import { useEffect, useMemo, useRef, useState } from "react";
import { parseChangelogData } from "./schema";
import type { ChangelogData } from "./types";

type ChangelogQueryParams = {
  base?: string;
  windowDays?: number;
  first?: number;
};

type ChangelogQueryResult = {
  data: ChangelogData | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  return query.toString();
}

async function fetchChangelog(
  params: {
    base?: string;
    windowDays?: number;
    first?: number;
    after?: string | null;
    cb?: number;
  },
  signal?: AbortSignal
) {
  const query = buildQueryString({
    base: params.base,
    windowDays: params.windowDays,
    first: params.first,
    after: params.after ?? undefined,
    cb: params.cb ?? undefined,
  });
  const response = await fetch(`/api/changelog?${query}`, { signal });
  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to load changelog: ${response.status}`;
    if (text) {
      try {
        const payload = JSON.parse(text) as { error?: string };
        if (payload?.error) message = payload.error;
      } catch {
        message = text;
      }
    }
    throw new Error(message.trim());
  }
  const json = (await response.json()) as unknown;
  const parsed = parseChangelogData(json);
  if (!parsed) throw new Error("Invalid changelog response");
  return parsed;
}

export function useChangelogQuery(params: ChangelogQueryParams): ChangelogQueryResult {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const paramsKey = useMemo(
    () => JSON.stringify({ base: params.base, windowDays: params.windowDays, first: params.first }),
    [params.base, params.windowDays, params.first]
  );
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = async (options?: { after?: string | null; cb?: number; append?: boolean }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const payload = await fetchChangelog(
      {
        base: params.base,
        windowDays: params.windowDays,
        first: params.first,
        after: options?.after,
        cb: options?.cb,
      },
      controller.signal
    );
    if (options?.append) {
      setData((current) =>
        current
          ? {
              ...payload,
              items: [...current.items, ...payload.items],
            }
          : payload
      );
    } else {
      setData(payload);
    }
    setStatus("ready");
    setError(null);
  };

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);
    void runFetch().catch((err) => {
      if (!isMounted) return;
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setError((err as Error).message ?? "Failed to load changelog");
    });
    return () => {
      isMounted = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const refresh = () => {
    setStatus("loading");
    setError(null);
    void runFetch({ cb: Date.now() }).catch((err) => {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setError((err as Error).message ?? "Failed to refresh changelog");
    });
  };

  const loadMore = () => {
    if (!data?.pageInfo.hasNextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    void runFetch({ after: data.pageInfo.endCursor, append: true })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Failed to load more changelog entries");
      })
      .finally(() => setIsLoadingMore(false));
  };

  return { data, status, error, refresh, loadMore, isLoadingMore };
}
