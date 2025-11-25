import fluxBadgeMark from "../assets/branding/flux-mark-badge.svg";
import { fluxVersion, fluxRepoPermalink } from "../lib/fluxMeta";

type FluxBadgeProps = {
  className?: string;
};

export function FluxBadge({ className }: FluxBadgeProps) {
  const versionLabel = fluxVersion ? `v${fluxVersion}` : "v0.0.0";

  const baseClasses = [
    "inline-flex items-center gap-2 rounded-lg border border-slate-200",
    "bg-white/90 px-3 py-1 text-xs font-medium text-slate-900",
    "shadow-sm transition hover:shadow-md hover:border-sky-200",
  ].join(" ");

  const mergedClassName = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <a
      href={fluxRepoPermalink}
      target="_blank"
      rel="noreferrer"
      className={mergedClassName}
      aria-label={`Flux repository (version ${versionLabel})`}
    >
      <img src={fluxBadgeMark} alt="Flux mark" className="h-4 w-auto" />
      <span className="font-plex-mono uppercase tracking-wide">flux</span>
      <span className="font-plex-mono text-[11px] text-slate-500">{versionLabel}</span>
    </a>
  );
}
