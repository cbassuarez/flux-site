import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DocsPage from "./pages/DocsPage";
import ToolingPage from "./pages/ToolingPage";
import RoadmapPage from "./pages/RoadmapPage";
import { Header } from "./components/Header";

function AppLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
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
