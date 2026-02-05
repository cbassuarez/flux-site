import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DocsPage from "./pages/DocsPage";
import ToolingPage from "./pages/ToolingPage";
import RoadmapPage from "./pages/RoadmapPage";
import { Header } from "./components/Header";
import EditorApp from "./edit/EditorApp";
import EditLandingPage from "./pages/EditLandingPage";

const isEditorBase = import.meta.env.BASE_URL.startsWith("/edit");

function DefaultLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <main className="pb-10">
        <Outlet />
      </main>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-600">
        <span>Flux v0.1 IR · © {new Date().getFullYear()} Flux contributors</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(0,205,254,0.4)]" />
          <span>Built with React, Tailwind, and Vite</span>
        </span>
      </footer>
    </div>
  );
}

function SiteShell() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <Outlet />
    </div>
  );
}

export default function App() {
  if (isEditorBase) {
    return <EditorApp />;
  }

  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/edit/*" element={<EditLandingPage />} />
          <Route path="/editor" element={<Navigate to="/edit" replace />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/tooling" element={<ToolingPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
