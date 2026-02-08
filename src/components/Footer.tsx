import {
  Badge,
  ChannelBadge,
  FluxBadge,
  CiBadge,
  DiscordBadge,
  DocsBadge,
  LicenseBadge,
  MaintainedBadge,
  SecurityBadge,
} from "@flux-lang/brand";
import { Link } from "react-router-dom";
import { SiteContainer } from "./SiteContainer";
import { FLUX_VERSION } from "../config/fluxMeta";
import { useFluxReleaseVersion } from "../lib/useFluxReleaseVersion";

const FOOTER_LINKS = [
  {
    title: "Docs",
    links: [
      { label: "Get Started", to: "/docs" },
      { label: "Docs", to: "/docs" },
    ],
  },
  {
    title: "Tooling",
    links: [
      { label: "Tooling", to: "/tooling" },
      { label: "Editor", to: "/edit" },
      { label: "CLI", to: "/tooling" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/cbassuarez/flux" },
      { label: "Releases", href: "https://github.com/cbassuarez/flux/releases" },
    ],
  },
];

export function Footer() {
  const releaseVersion = useFluxReleaseVersion(FLUX_VERSION ?? "0.0.0-dev");
  const copyInstallCommand = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText("npm i -g @flux-lang/flux");
  };

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]">
      <SiteContainer className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="text-lg font-semibold text-[var(--fg)]">Flux</div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Deterministic documents with layout-locked slots, built for live updates and stable
              pagination across tools.
            </p>
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Badges</div>
              <div className="flex flex-wrap items-center gap-2">
                <FluxBadge version={releaseVersion} />
                <ChannelBadge
                  channel="stable"
                  packageName="@flux-lang/flux"
                  label="Channel"
                  value="stable"
                />
                <CiBadge status="unknown" repo="cbassuarez/flux-site" workflowFile="deploy.yml" />
                <LicenseBadge license="UNLICENSED" href="https://github.com/cbassuarez/flux-site/blob/main/package.json" />
                <DocsBadge href="https://flux-lang.org/docs" />
                <DiscordBadge />
                <SecurityBadge repo="cbassuarez/flux-site" />
                <MaintainedBadge maintained label="Maintained" value="yes" href="https://github.com/cbassuarez/flux-site/commits/main" />
                <Badge
                  kind="docs"
                  label="Install"
                  value="copy"
                  onClick={copyInstallCommand}
                  title="Copy npm i -g @flux-lang/flux"
                  ariaLabel="Copy npm i -g @flux-lang/flux"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_LINKS.map((group) => (
              <div key={group.title} className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{group.title}</div>
                <ul className="space-y-2 text-sm">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {"to" in link ? (
                        <Link
                          to={link.to}
                          className="transition text-[var(--muted)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="transition text-[var(--muted)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--muted)]">
          <span>Requires Node ≥ 20</span>
          <span>© {new Date().getFullYear()} Flux contributors</span>
        </div>
      </SiteContainer>
    </footer>
  );
}
