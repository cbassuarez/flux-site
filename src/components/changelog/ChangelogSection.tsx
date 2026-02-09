import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useChangelogQuery } from "../../changelog/useChangelogQuery";
import { useDocstep } from "../../changelog/useDocstep";
import type { ChangelogItem } from "../../changelog/types";
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

function getDisplayChips(item: ChangelogItem) {
  const typeChip = item.chips.find((chip) => chip.kind === "type");
  const scopeChip = item.chips.find((chip) => chip.kind === "scope");
  const channelChip = item.chips.find((chip) => chip.kind === "channel");
  const chips = [typeChip, scopeChip].filter(Boolean).slice(0, 2);
  if (channelChip) chips.push(channelChip);
  return chips;
}

export function ChangelogSection() {
  const shouldReduceMotion = useReducedMotion();
  const [windowDays, setWindowDays] = useState(30);
  const [cursorMode, setCursorMode] = useState<"docstep" | "manual">("docstep");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data, status, error, refresh } = useChangelogQuery({
    base: "main",
    windowDays,
    first: 30,
  });

  const items = useMemo(() => (data?.items ?? FALLBACK_ITEMS).slice(0, 7), [data?.items]);

  const docstep = useDocstep({
    enabled: cursorMode === "docstep",
    length: items.length,
    reduceMotion: Boolean(shouldReduceMotion),
  });

  useEffect(() => {
    if (cursorMode === "docstep") {
      setSelectedIndex(items.length ? docstep.step % items.length : 0);
    }
  }, [cursorMode, docstep.step, items.length]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [windowDays, data?.items]);

  const selectedItem = items[selectedIndex] ?? items[0] ?? null;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (items.length === 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % items.length);
      docstep.setStep((index) => (index + 1) % items.length);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + items.length) % items.length);
      docstep.setStep((index) => (index - 1 + items.length) % items.length);
    }
    if (event.key === "Enter" && selectedItem) {
      event.preventDefault();
      if (event.shiftKey) {
        window.open(selectedItem.diffUrl, "_blank", "noopener,noreferrer");
      } else {
        window.open(selectedItem.url, "_blank", "noopener,noreferrer");
      }
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
              baseLabel={data?.source.base ?? "main"}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
              onRefresh={refresh}
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
              {items.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((index) => {
                        const next = index - 1 < 0 ? items.length - 1 : index - 1;
                        docstep.setStep(next);
                        return next;
                      })
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted)] hover:text-[var(--fg)]"
                    aria-label="Previous entry"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((index) => {
                        const next = index + 1 >= items.length ? 0 : index + 1;
                        docstep.setStep(next);
                        return next;
                      })
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
              {status === "error" ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted)]">
                  {error ?? "Changelog temporarily unavailable. Please refresh."}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted)]">
                  No changelog entries found for this window.
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const chips = getDisplayChips(item);
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
                          ? "border-[var(--ring)] bg-[var(--surface-2)]"
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
                              {chips.map((chip) => (
                                <span
                                  key={`${chip?.kind}-${chip?.value}`}
                                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
                                >
                                  {chip?.value}
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
