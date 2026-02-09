import { useReducedMotion } from "framer-motion";
import type { ChangelogItem as ApiChangelogItem } from "../../lib/changelogApi";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatTooltip = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type Props = {
  item: ApiChangelogItem;
  isSelected?: boolean;
  onOpen: (item: ApiChangelogItem) => void;
  onViewDiff: (item: ApiChangelogItem) => void;
};

export function ChangelogItem({ item, isSelected, onOpen, onViewDiff }: Props) {
  const shouldReduceMotion = useReducedMotion();
  const chips = [
    ...item.labels,
    ...(item.area ? [item.area] : []),
    item.channel,
    ...(item.breaking ? ["breaking"] : []),
  ].filter(Boolean);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
      className={[
        "group rounded-2xl border bg-[var(--surface-1)] p-4 text-left",
        isSelected
          ? "border-[var(--ring)] bg-[var(--surface-2)]"
          : "border-[var(--border)] hover:border-[var(--ring)]",
        shouldReduceMotion ? "" : "transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
            <span title={formatTooltip(item.mergedAt)}>{formatDate(item.mergedAt)}</span>
            <span className="text-[10px] font-mono tracking-tight text-[var(--muted)]">
              PR #{item.id}
            </span>
          </div>
          <div className="text-sm font-semibold text-[var(--fg)]">{item.title}</div>
          {item.summary ? <div className="text-xs text-[var(--muted)]">{item.summary}</div> : null}
          {chips.length ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${item.id}-${chip}`}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item);
            }}
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--fg)] hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
            aria-label={`Open pull request: ${item.title}`}
          >
            Open PR
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewDiff(item);
            }}
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--fg)] hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
            aria-label={`View diff for: ${item.title}`}
          >
            View diff
          </button>
        </div>
      </div>
    </article>
  );
}
