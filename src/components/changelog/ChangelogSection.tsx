import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { filterChangelogItems } from "../../changelog/filter";
import { useChangelogData } from "../../changelog/useChangelogData";
import type { ChangelogChannel, ChangelogItem } from "../../changelog/types";
import { SiteContainer } from "../SiteContainer";
import { ChangelogControls } from "./ChangelogControls";

const FALLBACK_ITEMS: ChangelogItem[] = [];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatYear = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.getFullYear();
};

const formatTooltip = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function ChangelogSection() {
  const { data } = useChangelogData();
  const shouldReduceMotion = useReducedMotion();
  const [windowDays, setWindowDays] = useState(30);
  const [channel, setChannel] = useState<ChangelogChannel>("stable");
  const [cursorMode, setCursorMode] = useState<"docstep" | "free">("docstep");
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    const items = data?.items ?? FALLBACK_ITEMS;
    const filtered = filterChangelogItems(items, { windowDays, channel, now });
    return filtered.slice(0, 7);
  }, [data?.items, windowDays, channel, now]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [windowDays, channel, data?.items]);

  const selectedItem = filteredItems[selectedIndex] ?? filteredItems[0] ?? null;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (cursorMode !== "docstep" || filteredItems.length === 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % filteredItems.length);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const handleRowClick = (item: ChangelogItem) => {
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="border-t border-[var(--border)] bg-[var(--surface-0)] py-12"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <SiteContainer className="px-2 sm:px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Changelog</div>
              <h2 className="font-display text-3xl font-light text-[var(--fg)]">Compiled from main.</h2>
              <p className="text-sm text-[var(--muted)]">User-visible updates from merged PRs.</p>
            </div>

            <ChangelogControls
              windowDays={windowDays}
              onWindowDaysChange={setWindowDays}
              channel={channel}
              onChannelChange={setChannel}
              availableChannels={availableChannels}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
            />

            <div>
              <Link
                to="/docs/changelog"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold text-[var(--fg)] transition hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
              >
                View all
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Latest entries
              </div>
              {cursorMode === "docstep" && filteredItems.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((index) =>
                        index - 1 < 0 ? filteredItems.length - 1 : index - 1
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted)] hover:text-[var(--fg)]"
                    aria-label="Previous entry"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((index) =>
                        index + 1 >= filteredItems.length ? 0 : index + 1
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted)] hover:text-[var(--fg)]"
                    aria-label="Next entry"
                  >
                    →
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted)]">
                  No changelog entries found for this window.
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleRowClick(item);
                        }
                      }}
                      className={[
                        "group rounded-2xl border bg-[var(--surface-1)] p-4 text-left shadow-sm",
                        isSelected
                          ? "border-[var(--ring)]"
                          : "border-[var(--border)] hover:border-[var(--ring)]",
                        shouldReduceMotion ? "" : "transition",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                            <span title={formatTooltip(item.mergedAt)}>
                              {formatDate(item.mergedAt)}
                              <span className="opacity-0 transition group-hover:opacity-100">
                                {formatYear(item.mergedAt) ? ` · ${formatYear(item.mergedAt)}` : ""}
                              </span>
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.chips.slice(0, 3).map((chip) => (
                                <span
                                  key={chip}
                                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[var(--fg)]">{item.title}</div>
                          {item.summary ? (
                            <div className="text-xs text-[var(--muted)]">{item.summary}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-[var(--muted)]">↗</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.open(item.diffUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold text-[var(--fg)] hover:border-[var(--ring)]"
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
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
