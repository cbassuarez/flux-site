import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useDocstep } from "../../changelog/useDocstep";
import { fetchChangelog } from "../../lib/changelogApi";
import type { ChangelogItem as ApiChangelogItem } from "../../lib/changelogApi";
import { SiteContainer } from "../SiteContainer";
import { ChangelogControls } from "./ChangelogControls";
import { ChangelogItem } from "./ChangelogItem";

const LIMIT = 7;

const skeletonItems = Array.from({ length: 3 });

export function HomeChangelog() {
  const shouldReduceMotion = useReducedMotion();
  const [items, setItems] = useState<ApiChangelogItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowDays, setWindowDays] = useState(30);
  const [cursorMode, setCursorMode] = useState<"docstep" | "manual">("docstep");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const docstep = useDocstep({
    enabled: cursorMode === "docstep",
    length: items.length,
    reduceMotion: Boolean(shouldReduceMotion),
    mode: cursorMode === "docstep" ? "random" : "sequential",
  });

  useEffect(() => {
    setSelectedIndex(0);
    docstep.setStep(0);
  }, [items.length]);

  useEffect(() => {
    if (!items.length || cursorMode !== "docstep") return;
    setSelectedIndex(docstep.step % items.length);
  }, [cursorMode, docstep.step, items.length]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError(null);

    fetchChangelog({ window: `${windowDays}d`, limit: LIMIT }, controller.signal)
      .then((response) => {
        setItems(response.items);
        setStatus("ready");
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setError((err as Error).message ?? "Changelog temporarily unavailable.");
      });

    return () => controller.abort();
  }, [refreshNonce, windowDays]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!items.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => {
        const next = (index + 1) % items.length;
        if (cursorMode === "docstep") {
          docstep.setStep(next);
        }
        return next;
      });
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => {
        const next = (index - 1 + items.length) % items.length;
        if (cursorMode === "docstep") {
          docstep.setStep(next);
        }
        return next;
      });
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[selectedIndex];
      if (item) {
        window.open(item.url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const selectedItemId = useMemo(() => items[selectedIndex]?.id, [items, selectedIndex]);

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
              <p className="text-sm text-[var(--muted)]">
                Merged PRs summarized into release-ready highlights, refreshed directly from the
                Flux feed.
              </p>
            </div>

            <ChangelogControls
              windowDays={windowDays}
              onWindowDaysChange={setWindowDays}
              baseLabel="main"
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
              onRefresh={() => setRefreshNonce((value) => value + 1)}
            />

            <div>
              <Link
                to="/docs/changelog"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold text-[var(--fg)] transition hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
              >
                View full changelog
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Latest entries
              </div>
              <div className="text-[11px] text-[var(--muted)]">↑ ↓ to move · Enter to open</div>
            </div>

            <div className="space-y-3">
              {status === "loading" ? (
                skeletonItems.map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className={[
                      "rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4",
                      shouldReduceMotion ? "" : "animate-pulse",
                    ].join(" ")}
                  >
                    <div className="h-3 w-24 rounded-full bg-[var(--surface-2)]" />
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
                    isSelected={item.id === selectedItemId}
                    onOpen={(entry) => window.open(entry.url, "_blank", "noopener,noreferrer")}
                    onViewDiff={(entry) => window.open(entry.diffUrl, "_blank", "noopener,noreferrer")}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
