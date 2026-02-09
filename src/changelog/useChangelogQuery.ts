import { useEffect, useMemo, useRef, useState } from "react";
import { fetchChangelog } from "../lib/changelogApi";
import { isPrerender } from "../lib/prerender";
import type { ChangelogItem as ApiChangelogItem } from "../lib/changelogApi";

type ChangelogData = {
  generatedAt: string;
  source: { repo: string; base: string };
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  items: ApiChangelogItem[];
};

type ChangelogQueryParams = {
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

const toWindow = (windowDays?: number) => (windowDays ? `${windowDays}d` : undefined);

async function fetchChangelogData(
  params: {
    windowDays?: number;
    first?: number;
    after?: string | null;
  },
  signal?: AbortSignal
): Promise<ChangelogData> {
  const response = await fetchChangelog(
    {
      window: toWindow(params.windowDays),
      limit: params.first,
      cursor: params.after ?? undefined,
    },
    signal
  );

  return {
    generatedAt: response.generatedAt,
    source: { repo: response.source.repo, base: response.source.branch },
    pageInfo: {
      hasNextPage: Boolean(response.nextCursor),
      endCursor: response.nextCursor ?? null,
    },
    items: response.items,
  };
}

export function useChangelogQuery(params: ChangelogQueryParams): ChangelogQueryResult {
  const prerenderMode = isPrerender();
  const [data, setData] = useState<ChangelogData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const paramsKey = useMemo(
    () => JSON.stringify({ windowDays: params.windowDays, first: params.first }),
    [params.windowDays, params.first]
  );
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = async (options?: { after?: string | null; append?: boolean }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const payload = await fetchChangelogData(
      {
        windowDays: params.windowDays,
        first: params.first,
        after: options?.after,
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
    if (prerenderMode) {
      setStatus("ready");
      setError(null);
      setData(null);
      return undefined;
    }
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
  }, [paramsKey, prerenderMode]);

  const refresh = () => {
    if (prerenderMode) return;
    setStatus("loading");
    setError(null);
    void runFetch().catch((err) => {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setError((err as Error).message ?? "Failed to refresh changelog");
    });
  };

  const loadMore = () => {
    if (prerenderMode) return;
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
