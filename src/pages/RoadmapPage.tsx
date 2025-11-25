import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
];

export default function RoadmapPage() {
  return (
    <PageLayout
      title="Roadmap"
      subtitle="Flux v0.1 focus areas and what comes next."
      eyebrow={<FluxBrandStrip subtitle="roadmap" />}
      headerSlot={<PageTOC items={tocItems} />}
    >
      <section id="overview" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Roadmap</h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Flux v0.1 focuses on the core language, IR, and a minimal runtime kernel. The roadmap below highlights some of the next concrete milestones.
        </p>
      </section>

      <section id="milestones" className="grid gap-4 md:grid-cols-2 max-w-4xl scroll-mt-24">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Runtime: event rules</h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Implementing <span className="font-mono">handleEvent</span> in the runtime kernel to support event-mode rules and event-type strings (e.g. <span className="font-mono">on = "input"</span>, <span className="font-mono">"click"</span>, <span className="font-mono">"hover"</span>).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Richer static checks</h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Extending <span className="font-mono">flux check</span> and the editor diagnostics to cover type flows, neighbor constraints, and grid layouts — catching more issues before runtime.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">In-browser playground</h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            A small playground where you can type Flux code, inspect the IR, and run the runtime kernel in the browser to step the document over time.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Language v0.2</h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Evolving the language surface and IR: extended runtime configuration, new rule modes, and additional topologies, while keeping the versioned IR contract explicit.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
