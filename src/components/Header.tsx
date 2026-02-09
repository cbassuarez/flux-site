import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { coerceVersionInfo, type FluxVersionInfo } from "@flux-lang/brand";
import { FluxBrandHeader } from "@flux-lang/brand/web";
import { getFluxVersionInfo } from "../lib/versionInfo";
import { useFluxReleaseVersion } from "../lib/useFluxReleaseVersion";
import { SiteContainer } from "./SiteContainer";
import { Button, ButtonAnchor } from "./ui/Button";

const NAV_ITEMS = [
  { path: "/", label: "Overview" },
  { path: "/docs", label: "Docs" },
  { path: "/edit", label: "Editor" },
  { path: "/tooling", label: "Tooling" },
  { path: "/roadmap", label: "Roadmap" },
];
const SITE_TITLE = "Flux";
const SITE_TAGLINE = "Language + toolchain for scores";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.48 0-.24-.01-.86-.01-1.7-2.78.62-3.37-1.38-3.37-1.38-.46-1.2-1.12-1.52-1.12-1.52-.92-.65.07-.64.07-.64 1.02.07 1.56 1.08 1.56 1.08.9 1.6 2.36 1.14 2.94.87.09-.67.35-1.14.63-1.4-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.74 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.35c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.56 1.42.21 2.48.1 2.74.64.72 1.02 1.63 1.02 2.75 0 3.95-2.34 4.82-4.57 5.07.36.33.68.96.68 1.94 0 1.4-.01 2.54-.01 2.89 0 .26.18.58.69.48A10.01 10.01 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function Header() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [brandInfo, setBrandInfo] = useState<FluxVersionInfo>(() => coerceVersionInfo({ version: "0.0.0" }));
  const location = useLocation();

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);
  const openDocsFromVersion = () => {
    closeMenu();
    navigate("/docs");
  };

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    void getFluxVersionInfo().then((info) => {
      if (!active) return;
      setBrandInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  const releaseVersion = useFluxReleaseVersion(brandInfo.version ?? "0.0.0");
  const displayBrandInfo = { ...brandInfo, version: releaseVersion, tagline: SITE_TAGLINE };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-0)] backdrop-blur">
      <SiteContainer className="flex items-center justify-between py-3">
        <Link to="/" className="flex items-center text-[var(--fg)]">
          {/* Brand comes from @flux-lang/brand; do not fork. */}
          <span className="hidden md:inline-flex">
            <FluxBrandHeader
              info={displayBrandInfo}
              variant="marketing"
              markPath="/flux-mark-favicon.svg"
              markRenderMode="color"
              showTagline
              onVersionClick={openDocsFromVersion}
              line2ClassName="text-[11px] text-[var(--muted)]"
            />
          </span>
          <span className="inline-flex md:hidden">
            <FluxBrandHeader
              info={displayBrandInfo}
              variant="menu"
              markPath="/flux-mark-favicon.svg"
              markRenderMode="color"
              showTagline={false}
              title={SITE_TITLE}
              onVersionClick={openDocsFromVersion}
            />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted)] md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
            >
              {({ isActive }) => {
                const showIndicator = isActive || hoveredPath === item.path;
                return (
                  <motion.span
                    className="relative inline-flex flex-col items-center gap-1"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span
                      className={[
                        "transition-colors",
                        isActive ? "flux-gradient-text font-semibold" : "text-[var(--muted)] hover:text-[var(--fg)]",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                    <AnimatePresence>
                      {showIndicator && (
                        <motion.span
                          layoutId="nav-underline"
                          className="block h-[3px] w-full rounded-full flux-gradient-bg"
                          initial={{ opacity: 0, scaleX: 0.6 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          exit={{ opacity: 0, scaleX: 0.4 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.span>
                );
              }}
            </NavLink>
          ))}
          <ButtonAnchor
            href="https://github.com/cbassuarez/flux"
            variant="ghost"
            size="sm"
            iconOnly
            className="text-[var(--muted)] hover:text-[var(--fg)]"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </ButtonAnchor>
        </nav>

        <Button
          type="button"
          onClick={toggleMenu}
          variant="solid"
          size="sm"
          iconOnly
          className="md:hidden"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="relative inline-block h-3.5 w-4">
            <span
              className={`absolute inset-x-0 top-[2px] h-[1.5px] rounded-full bg-current transition ${
                isOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute inset-x-0 top-[7px] h-[1.5px] rounded-full bg-current transition ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute inset-x-0 top-[12px] h-[1.5px] rounded-full bg-current transition ${
                isOpen ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </span>
        </Button>
      </SiteContainer>

      <AnimatePresence>
        {isOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="md:hidden"
          >
            <div className="border-t border-[var(--border)] bg-[var(--surface-0)] px-4 pb-4 pt-2 shadow-sm">
              <div className="mb-2 rounded-lg bg-[var(--surface-1)] px-2 py-1 text-[11px] text-[var(--muted)]">
                {SITE_TAGLINE}
              </div>
              <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--fg)]">
                {NAV_ITEMS.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        [
                          "block rounded-lg px-2 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]",
                          isActive
                            ? "bg-[var(--surface-2)] flux-gradient-text font-semibold"
                            : "hover:bg-[var(--surface-1)]",
                        ].join(" ")
                      }
                      end={item.path === "/"}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <ButtonAnchor
                    href="https://github.com/cbassuarez/flux"
                    onClick={closeMenu}
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className="w-fit"
                    aria-label="GitHub"
                  >
                    <GitHubIcon className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </ButtonAnchor>
                </li>
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
