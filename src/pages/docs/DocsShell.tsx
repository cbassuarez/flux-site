import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DocsRenderer } from "./DocsRenderer";
import { defaultDocSlug, docsSections, getDocsPage } from "./docsMap";
import { SiteContainer } from "../../components/SiteContainer";

const githubUrl = "https://github.com/cbassuarez/flux";

function useDocSlug() {
  const location = useLocation();
  return useMemo(() => {
    const parts = location.pathname.split("/docs/");
    if (parts.length < 2) return "";
    return parts[1].split("/")[0];
  }, [location.pathname]);
}

export default function DocsShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const slug = useDocSlug();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!slug && (location.pathname === "/docs" || location.pathname === "/docs/")) {
      navigate(`/docs/${defaultDocSlug}`, { replace: true });
    }
  }, [location.pathname, navigate, slug]);

  const page = getDocsPage(slug) ?? null;
  const pageTitle = page?.title ?? "Page Not Found";
  const pageDescription =
    page?.description ?? "We couldn't find this doc. Pick a page from the navigation to keep going.";

  const filteredSections = useMemo(() => {
    if (!filter.trim()) return docsSections;
    const query = filter.trim().toLowerCase();
    return docsSections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((doc) =>
          `${doc.title} ${doc.description}`.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.pages.length > 0);
  }, [filter]);

  const content = page?.content ?? `# Page Not Found\n\nThe requested doc doesn't exist. Head back to [Get Started](/docs/${defaultDocSlug}) or choose another page.`;

  return (
    <section className="bg-flux-hero py-8 text-slate-900">
      <SiteContainer>
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:sticky lg:top-6 lg:self-start">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Docs</div>
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter pages"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
              />
              <nav className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                {filteredSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.pages.map((doc) => {
                        const isActive = doc.slug === slug || (!slug && doc.slug === defaultDocSlug);
                        return (
                          <Link
                            key={doc.slug}
                            to={`/docs/${doc.slug}`}
                            className={[
                              "flex flex-col gap-1 rounded-xl border px-3 py-2 text-left text-xs transition",
                              isActive
                                ? "border-slate-300 bg-slate-900 text-white shadow-sm"
                                : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white",
                            ].join(" ")}
                            title={doc.title}
                          >
                            <span className="font-medium text-sm leading-tight">{doc.title}</span>
                            <span className={isActive ? "text-slate-200" : "text-slate-400"}>
                              {doc.description}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{page?.section ?? "Docs"}</div>
                  <h1 className="font-display text-3xl font-light tracking-tight text-slate-900 md:text-4xl">
                    {pageTitle}
                  </h1>
                  <p className="text-sm text-slate-600 md:text-base">{pageDescription}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/docs/${defaultDocSlug}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Get Started
                  </Link>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                  >
                    GitHub
                  </a>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4 md:hidden">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Choose A Page
                  <select
                    value={page?.slug ?? defaultDocSlug}
                    onChange={(event) => navigate(`/docs/${event.target.value}`)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
                  >
                    {docsSections.flatMap((section) =>
                      section.pages.map((doc) => (
                        <option key={doc.slug} value={doc.slug}>
                          {section.title} · {doc.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>

            <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="space-y-6">
                <DocsRenderer content={content} />
              </div>
            </article>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
