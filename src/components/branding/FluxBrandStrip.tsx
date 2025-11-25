import type { ReactNode } from "react";
import { FluxMark } from "./FluxMark";

type FluxBrandStripProps = {
  subtitle?: string;
  className?: string;
  prefix?: ReactNode;
};

export function FluxBrandStrip({ subtitle, className, prefix }: FluxBrandStripProps) {
  return (
    <div className={["flux-brand-strip", className].filter(Boolean).join(" ")}>
      {prefix}
      <FluxMark variant="frame" animate className="h-10 w-10" />
      <div className="flux-brand-strip-text">
        <span className="flux-brand-strip-title">flux</span>
        {subtitle && <span className="flux-brand-strip-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
