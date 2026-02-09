import type { ReactNode } from "react";
import { Button } from "../ui/Button";

const windowOptions = [7, 30, 90, 365] as const;

type ChangelogControlsProps = {
  windowDays: number;
  onWindowDaysChange: (days: number) => void;
  baseLabel: string;
  cursorMode?: "docstep" | "manual";
  onCursorModeChange?: (mode: "docstep" | "manual") => void;
  onRefresh?: () => void;
};

function ChipButton({ children, onClick, title }: { children: ReactNode; onClick?: () => void; title?: string }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      title={title}
      variant="badge"
      size="sm"
      className="normal-case tracking-[0.14em] text-[var(--muted)] hover:text-[var(--fg)]"
    >
      {children}
    </Button>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="badge"
      size="sm"
      className={[
        "normal-case tracking-[0.14em]",
        active
          ? "border-[var(--ring)] bg-[var(--surface-2)] text-[var(--fg)]"
          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted)] hover:text-[var(--fg)]",
      ].join(" ")}
    >
      {children}
    </Button>
  );
}

export function ChangelogControls({
  windowDays,
  onWindowDaysChange,
  baseLabel,
  cursorMode,
  onCursorModeChange,
  onRefresh,
}: ChangelogControlsProps) {
  const copyChip = (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ChipButton
          onClick={() => copyChip(`source: github(prs@${baseLabel})`)}
          title="Copy source filter"
        >
          {`source: github(prs@${baseLabel})`}
        </ChipButton>
        <ChipButton
          onClick={() => copyChip('filter: label("changelog")')}
          title="Copy label filter"
        >
          filter: label("changelog")
        </ChipButton>
        {onRefresh ? (
          <ChipButton onClick={onRefresh} title="Refresh changelog">
            refresh
          </ChipButton>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">window</span>
        {windowOptions.map((option) => (
          <ToggleButton
            key={option}
            active={windowDays === option}
            onClick={() => onWindowDaysChange(option)}
          >
            last({option}d)
          </ToggleButton>
        ))}
      </div>

      {cursorMode && onCursorModeChange ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">cursor</span>
          {(["docstep", "manual"] as const).map((option) => (
            <ToggleButton
              key={option}
              active={cursorMode === option}
              onClick={() => onCursorModeChange(option)}
            >
              {option}
            </ToggleButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
