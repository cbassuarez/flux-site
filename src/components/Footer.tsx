import { Link } from "react-router-dom";
import { FluxBadge } from "./FluxBadge";
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
                <span className="rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  More soon
                </span>
                <span className="rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Labs
                </span>
                <span className="rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Partners
                </span>
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
