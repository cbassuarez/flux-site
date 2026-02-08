import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FLUX_TAGLINE, coerceVersionInfo, type FluxVersionInfo } from "@flux-lang/brand";
import { FluxBrandHeader } from "@flux-lang/brand/web";
import { getFluxVersionInfo } from "../lib/versionInfo";
import { SiteContainer } from "./SiteContainer";

const NAV_ITEMS = [
  { path: "/", label: "Overview" },
  { path: "/docs", label: "Docs" },
  { path: "/edit", label: "Editor" },
  { path: "/tooling", label: "Tooling" },
  { path: "/roadmap", label: "Roadmap" },
];

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

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <SiteContainer className="flex items-center justify-between py-3">
        <Link to="/" className="flex items-center text-slate-900">
          {/* Brand comes from @flux-lang/brand; do not fork. */}
          <span className="hidden md:inline-flex">
            <FluxBrandHeader
              info={brandInfo}
              variant="marketing"
              markPath="/flux-mark-favicon.svg"
              showTagline
              onVersionClick={openDocsFromVersion}
              line2ClassName="text-[11px] text-slate-500"
            />
          </span>
          <span className="inline-flex md:hidden">
            <FluxBrandHeader
              info={brandInfo}
              variant="menu"
              markPath="/flux-mark-favicon.svg"
              showTagline={false}
              title={FLUX_TAGLINE}
              onVersionClick={openDocsFromVersion}
            />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
                        isActive ? "flux-gradient-text font-semibold" : "text-slate-600 hover:text-slate-900",
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
          <motion.a
            href="https://github.com/cbassuarez/flux"
            className="rounded-md hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Flux GitHub repository"
          >
            GitHub
          </motion.a>
        </nav>

        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:hidden"
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
        </button>
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
            <div className="border-t border-slate-200 bg-white/95 px-4 pb-4 pt-2 shadow-sm">
              <div className="mb-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                {brandInfo.tagline}
              </div>
              <ul className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {NAV_ITEMS.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        [
                          "block rounded-lg px-2 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          isActive
                            ? "bg-slate-100 flux-gradient-text font-semibold"
                            : "hover:bg-slate-50",
                        ].join(" ")
                      }
                      end={item.path === "/"}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <a
                    href="https://github.com/cbassuarez/flux"
                    onClick={closeMenu}
                    className="block rounded-lg px-2 py-2.5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
