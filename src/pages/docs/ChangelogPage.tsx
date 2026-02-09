import { useEffect, useRef, useState } from "react";
import { ChangelogControls } from "../../components/changelog/ChangelogControls";
import { ChangelogItem } from "../../components/changelog/ChangelogItem";
import { fetchChangelog } from "../../lib/changelogApi";
import type { ChangelogItem as ApiChangelogItem } from "../../lib/changelogApi";

const LIMIT = 20;
const skeletonItems = Array.from({ length: 4 });

export default function ChangelogPage() {
  const [items, setItems] = useState<ApiChangelogItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [windowDays, setWindowDays] = useState(365);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError(null);

    fetchChangelog({ window: `${windowDays}d`, limit: LIMIT }, controller.signal)
      .then((response) => {
        setItems(response.items);
        setNextCursor(response.nextCursor ?? null);
        setStatus("ready");
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setError((err as Error).message ?? "Changelog temporarily unavailable.");
      });

    return () => controller.abort();
  }, [refreshNonce, windowDays]);

  const loadMore = () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    fetchChangelog({ window: `${windowDays}d`, limit: LIMIT, cursor: nextCursor })
      .then((response) => {
        setItems((current) => [...current, ...response.items]);
        setNextCursor(response.nextCursor ?? null);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Failed to load more changelog entries.");
      })
      .finally(() => setIsLoadingMore(false));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Changelog</div>
          <p className="text-sm text-[var(--muted)]">
            A year of merged PRs labeled <span className="font-semibold text-[var(--fg)]">changelog</span>,
            streamed from the Flux changelog service.
          </p>
        </div>
        <div className="mt-4">
          <ChangelogControls
            windowDays={windowDays}
            onWindowDaysChange={setWindowDays}
            baseLabel="main"
            onRefresh={() => setRefreshNonce((value) => value + 1)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {status === "loading" ? (
          skeletonItems.map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
            >
              <div className="h-3 w-32 rounded-full bg-[var(--surface-2)]" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-[var(--surface-2)]" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-[var(--surface-2)]" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
                <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
              </div>
            </div>
          ))
        ) : status === "error" ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted)]">
            {error ?? "Changelog temporarily unavailable."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted)]">
            No changelog entries found for this window.
          </div>
        ) : (
          items.map((item) => (
            <ChangelogItem
              key={item.id}
              item={item}
              onOpen={(entry) => window.open(entry.url, "_blank", "noopener,noreferrer")}
              onViewDiff={(entry) => window.open(entry.diffUrl, "_blank", "noopener,noreferrer")}
            />
          ))
        )}
      </div>

      {nextCursor ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
