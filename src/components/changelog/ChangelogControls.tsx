import type { ReactNode } from "react";
import type { ChangelogChannel } from "../../changelog/types";

const windowOptions = [7, 30, 90] as const;

type ChangelogControlsProps = {
  windowDays: number;
  onWindowDaysChange: (days: number) => void;
  channel: ChangelogChannel;
  onChannelChange: (channel: ChangelogChannel) => void;
  availableChannels: ChangelogChannel[];
  cursorMode?: "docstep" | "free";
  onCursorModeChange?: (mode: "docstep" | "free") => void;
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold text-[var(--muted)]">
      {children}
    </span>
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
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "border-[var(--ring)] bg-[var(--surface-2)] text-[var(--fg)]"
          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted)] hover:text-[var(--fg)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ChangelogControls({
  windowDays,
  onWindowDaysChange,
  channel,
  onChannelChange,
  availableChannels,
  cursorMode,
  onCursorModeChange,
}: ChangelogControlsProps) {
  const channels = availableChannels.length ? availableChannels : ["stable"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Chip>source: github(prs@main)</Chip>
        <Chip>filter: label("changelog")</Chip>
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">channel</span>
        {channels.map((option) => (
          <ToggleButton
            key={option}
            active={channel === option}
            onClick={() => onChannelChange(option)}
          >
            {option}
          </ToggleButton>
        ))}
      </div>

      {cursorMode && onCursorModeChange ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">cursor</span>
          {(["docstep", "free"] as const).map((option) => (
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
