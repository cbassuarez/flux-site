import type { ReactNode } from "react";
import fluxBadgeMark from "../assets/branding/flux-mark-badge.svg";
import {
  FLUX_VERSION,
  FLUX_REPO_PERMALINK,
} from "../config/fluxMeta";

type FluxBadgeProps = {
  className?: string;
  children?: ReactNode; // kept for future flexibility (not required)
};

export function FluxBadge({ className }: FluxBadgeProps) {
  const baseClasses =
    "inline-flex items-center gap-2 rounded-lg border border-slate-200 " +
    "bg-white/90 px-3 py-1 text-xs font-medium text-slate-900 " +
    "shadow-sm transition hover:shadow-md hover:border-sky-200 hover:bg-white " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  const mergedClassName = className
    ? `${baseClasses} ${className}`
    : baseClasses;

  const rawVersion = (FLUX_VERSION ?? "").toString();
  const versionLabel =
    rawVersion && rawVersion.startsWith("v")
      ? rawVersion
      : rawVersion
        ? `v${rawVersion}`
        : "v0.0.0-dev";

  return (
    <a
      href="https://github.com/cbassuarez/flux"
      target="_blank"
      rel="noreferrer"
      className={mergedClassName}
      aria-label={`Flux repository (version ${versionLabel})`}
    >
      <img
        src={fluxBadgeMark}
        alt="Flux mark"
        className="h-4 w-auto"
      />
      <span className="uppercase tracking-wide">flux</span>
      <span className="text-[11px] text-slate-500">
        {versionLabel}
      </span>
    </a>
  );
}
