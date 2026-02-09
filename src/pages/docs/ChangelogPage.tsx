import { useEffect, useMemo, useRef, useState } from "react";
import { filterChangelogItems } from "../../changelog/filter";
import { useChangelogData } from "../../changelog/useChangelogData";
import type { ChangelogChannel } from "../../changelog/types";
import { ChangelogControls } from "../../components/changelog/ChangelogControls";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function ChangelogPage() {
  const { data } = useChangelogData();
  const [windowDays, setWindowDays] = useState(30);
  const [channel, setChannel] = useState<ChangelogChannel>("stable");
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [now] = useState(() => Date.now());

  const availableChannels = useMemo<ChangelogChannel[]>(() => {
    const channels = new Set<ChangelogChannel>();
    (data?.items ?? []).forEach((item) => channels.add(item.channel));
    const filtered = Array.from(channels).filter((value) => value !== "unknown");
    return filtered.length ? filtered : ["stable"];
  }, [data?.items]);

  useEffect(() => {
    if (!availableChannels.includes(channel)) {
      setChannel(availableChannels[0] ?? "stable");
    }
  }, [availableChannels, channel]);

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    return filterChangelogItems(items, { windowDays, channel, now });
  }, [data?.items, windowDays, channel, now]);

  useEffect(() => {
    setVisibleCount(20);
  }, [windowDays, channel]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleCount((count) => Math.min(count + 20, filteredItems.length));
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [filteredItems.length]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleItems.length < filteredItems.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Changelog</div>
            <p className="mt-1 text-sm text-slate-600">
              Merged PRs labeled <span className="font-semibold">changelog</span>, compiled from local JSON.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ChangelogControls
            windowDays={windowDays}
            onWindowDaysChange={setWindowDays}
            channel={channel}
            onChannelChange={setChannel}
            availableChannels={availableChannels}
          />
        </div>
      </div>

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-500">
            No changelog entries found for this window.
          </div>
        ) : (
          visibleItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">{formatDate(item.mergedAt)}</div>
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  {item.summary ? (
                    <div className="text-xs text-slate-600">{item.summary}</div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {item.chips.slice(0, 3).map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Open PR
                  </a>
                  <a
                    href={item.diffUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    View diff
                  </a>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {hasMore ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + 20, filteredItems.length))}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Load more
          </button>
          <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
        </div>
      ) : (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      )}
    </div>
  );
}
