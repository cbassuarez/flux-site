import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DocsShell from "./pages/docs/DocsShell";
import ToolingPage from "./pages/ToolingPage";
import RoadmapPage from "./pages/RoadmapPage";
import { Header } from "./components/Header";
import EditLandingPage from "./pages/EditLandingPage";
import { Footer } from "./components/Footer";
import { ScrollProgress } from "./components/ScrollProgress";

function DefaultLayout() {
  return (
    <>
      <main className="pb-10">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function SiteShell() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--fg)]">
      <ScrollProgress />
      <Header />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/edit/*" element={<EditLandingPage />} />
          <Route path="/editor" element={<Navigate to="/edit" replace />} />
          <Route path="/docs/*" element={<DocsShell />} />
          <Route path="/tooling" element={<ToolingPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
