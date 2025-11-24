import { Route, Routes, NavLink, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DocsPage from "./pages/DocsPage";
import ToolingPage from "./pages/ToolingPage";
import RoadmapPage from "./pages/RoadmapPage";

const NAV_ITEMS = [
  { path: "/", label: "Overview" },
  { path: "/docs", label: "Docs" },
  { path: "/tooling", label: "Tooling" },
  { path: "/roadmap", label: "Roadmap" },
];

function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flux-gradient-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top nav */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-fluxBlue/20 border border-fluxBlue/70 flex items-center justify-center shadow-[0_0_24px_rgba(0,205,254,0.75)]">
              <span className="text-xs font-semibold text-fluxBlue tracking-widest">
                FX
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-50">
                Flux
              </span>
              <span className="text-[11px] text-zinc-400">
                procedurally evolving music scores and parts
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "transition-colors",
                    isActive
                      ? "text-fluxBlue"
                      : "text-zinc-400 hover:text-zinc-100",
                  ].join(" ")
                }
                end={item.path === "/"}
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href="https://github.com/cbassuarez/flux"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-fluxBlue/80 hover:text-fluxBlue transition-colors"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-fluxBlue shadow-[0_0_8px_rgba(0,205,254,0.9)]" />
              View on GitHub
            </a>
          </nav>
        </header>

        {/* Mobile nav */}
        <nav className="mt-4 md:hidden flex items-center justify-between gap-3 text-xs border border-zinc-800 rounded-full px-2 py-1 bg-zinc-950/70">
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "px-2 py-1 rounded-full transition-colors",
                      isActive || active
                        ? "bg-zinc-900 text-fluxBlue"
                        : "text-zinc-400",
                    ].join(" ")
                  }
                  end={item.path === "/"}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
          <a
            href="https://github.com/cbassuarez/flux"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded-full border border-zinc-700 text-[11px] text-zinc-300"
          >
            GitHub
          </a>
        </nav>

        {/* Main content */}
        <main className="mt-8 pb-10">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/tooling" element={<ToolingPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
          </Routes>
        </main>

        <footer className="border-t border-zinc-900 pt-4 mt-4 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <span>Flux v0.1 IR · © {new Date().getFullYear()} Flux contributors</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-fluxBlue/80 shadow-[0_0_12px_rgba(0,205,254,0.9)]" />
            <span>Built with React, Tailwind, and Vite</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return <AppLayout />;
}
