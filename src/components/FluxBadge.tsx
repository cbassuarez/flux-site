import fluxMarkFull from "../assets/branding/flux-mark-full.svg";
import pkg from "../../package.json";

interface FluxBadgeProps {
  className?: string;
}

export function FluxBadge({ className }: FluxBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-transparent bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm flux-gradient-border ${className ?? ""}`.trim()}
    >
      <img src={fluxMarkFull} alt="Flux mark" className="h-6 w-6" />
      <span className="font-semibold text-slate-900">flux language</span>
      <span className="font-mono text-[11px] text-slate-600">v{pkg.version}</span>
    </div>
  );
}
