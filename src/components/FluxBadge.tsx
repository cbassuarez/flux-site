import type { ReactNode } from "react";
import { NpmBadge } from "@flux-lang/brand";
import {
  FLUX_VERSION,
} from "../config/fluxMeta";

type FluxBadgeProps = {
  className?: string;
  children?: ReactNode; // kept for future flexibility (not required)
  version?: string;
};

export function FluxBadge({ className, version }: FluxBadgeProps) {
  const rawVersion = (version ?? FLUX_VERSION ?? "0.0.0-dev").toString();
  const normalizedVersion = rawVersion.replace(/^v+/i, "") || "0.0.0-dev";

  return (
    <NpmBadge
      packageName="@flux-lang/flux"
      version={normalizedVersion}
      className={className}
      title={`@flux-lang/flux package v${normalizedVersion}`}
      ariaLabel={`@flux-lang/flux package version v${normalizedVersion}`}
    />
  );
}
