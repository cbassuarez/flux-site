import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "Overview" },
  { path: "/docs", label: "Docs" },
  { path: "/tooling", label: "Tooling" },
  { path: "/roadmap", label: "Roadmap" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl border border-sky-100 bg-sky-50 shadow-[0_0_24px_rgba(0,205,254,0.35)] flex items-center justify-center">
            <span className="text-xs font-semibold text-sky-600 tracking-widest">FX</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-slate-900">Flux</span>
            <span className="text-[11px] text-slate-500">procedurally evolving music scores and parts</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "transition-colors",
                  isActive ? "text-sky-600" : "hover:text-slate-900",
                ].join(" ")
              }
              end={item.path === "/"}
            >
              {item.label}
            </NavLink>
          ))}
          <a
            href="https://github.com/cbassuarez/flux"
            className="hover:text-slate-900"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800 md:hidden"
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
      </div>

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
              <ul className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {NAV_ITEMS.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        [
                          "block rounded-lg px-2 py-2.5 transition",
                          isActive ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50",
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
                    className="block rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
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
