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
    <div className="min-h-screen bg-white text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border border-sky-100 bg-sky-50 shadow-[0_0_24px_rgba(0,205,254,0.35)] flex items-center justify-center">
              <span className="text-xs font-semibold text-sky-600 tracking-widest">
                FX
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">Flux</span>
              <span className="text-[11px] text-slate-500">
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
                      ? "text-sky-600"
                      : "text-slate-500 hover:text-slate-900",
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(0,205,254,0.65)]" />
              View on GitHub
            </a>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile nav */}
        <nav className="md:hidden mb-6 flex items-center justify-between gap-3 text-xs border border-slate-200 rounded-full px-2 py-1 bg-white/90 shadow-sm">
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
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-500 hover:text-slate-800",
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
            className="px-2 py-1 rounded-full border border-slate-200 text-[11px] text-slate-600"
          >
            GitHub
          </a>
        </nav>

        {/* Main content */}
        <main className="pb-10">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/tooling" element={<ToolingPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 pt-4 mt-6 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>Flux v0.1 IR · © {new Date().getFullYear()} Flux contributors</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(0,205,254,0.4)]" />
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
