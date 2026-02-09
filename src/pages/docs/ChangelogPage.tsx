import { useState } from "react";
import { useChangelogQuery } from "../../changelog/useChangelogQuery";
import type { ChangelogItem } from "../../changelog/types";
import { ChangelogControls } from "../../components/changelog/ChangelogControls";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function getDisplayChips(item: ChangelogItem) {
  const typeChip = item.chips.find((chip) => chip.kind === "type");
  const scopeChip = item.chips.find((chip) => chip.kind === "scope");
  const channelChip = item.chips.find((chip) => chip.kind === "channel");
  const chips = [typeChip, scopeChip].filter(Boolean).slice(0, 2);
  if (channelChip) chips.push(channelChip);
  return chips;
}

export default function ChangelogPage() {
  const [windowDays, setWindowDays] = useState(30);
  const { data, status, error, refresh, loadMore, isLoadingMore } = useChangelogQuery({
    base: "main",
    windowDays,
    first: 20,
  });

  const items = data?.items ?? [];
  const hasMore = data?.pageInfo.hasNextPage ?? false;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Changelog</div>
            <p className="mt-1 text-sm text-slate-600">
              Merged PRs labeled <span className="font-semibold">changelog</span>, streamed from
              GitHub.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ChangelogControls
            windowDays={windowDays}
            onWindowDaysChange={setWindowDays}
            baseLabel={data?.source.base ?? "main"}
            onRefresh={refresh}
          />
        </div>
      </div>

      <div className="space-y-3">
        {status === "error" ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-500">
            {error ?? "Changelog temporarily unavailable. Please refresh."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-500">
            No changelog entries found for this window.
          </div>
        ) : (
          items.map((item) => {
            const chips = getDisplayChips(item);
            return (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    window.open(item.url, "_blank", "noopener,noreferrer");
                  }
                }}
                className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">{formatDate(item.mergedAt)}</div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    {item.summary ? (
                      <div className="text-xs text-slate-600">{item.summary}</div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <span
                          key={`${chip?.kind}-${chip?.value}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                        >
                          {chip?.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(item.diffUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      View diff
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {hasMore ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
