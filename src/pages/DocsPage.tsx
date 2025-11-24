import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "shape", label: "Top-level shape" },
  { id: "ir", label: "IR details" },
];

export default function DocsPage() {
  return (
    <PageLayout
      title="Docs"
      subtitle="Flux v0.1 IR, language surface, and runtime."
      headerSlot={<PageTOC items={tocItems} />}
    >
      <section id="overview" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Flux v0.1 language &amp; IR</h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Flux v0.1 is defined in terms of a canonical JSON intermediate representation called <span className="font-mono">FluxDocument</span>.
          You obtain this IR by parsing a source string with <span className="font-mono">parseDocument(source)</span> from <span className="font-mono">@flux-lang/core</span> and serializing the result with <span className="font-mono">JSON.stringify</span>.
        </p>
      </section>

      <section id="shape" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Top-level shape</h2>
        <p className="text-sm text-slate-600">At a high level, a Flux document looks like:</p>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-slate-800 overflow-auto border border-slate-200 bg-slate-50 rounded-xl">
          <code>{`interface FluxDocument {
  meta: FluxMeta;
  state: FluxState;
  pageConfig?: PageConfig;
  grids: FluxGrid[];
  rules: FluxRule[];
  runtime?: FluxRuntimeConfig;
}`}</code>
        </pre>
        <p className="text-xs text-slate-500">
          The IR normalizes the grammar into a discriminated union of node kinds. Expressions, statements, rules, and runtime configuration are all represented as explicit JSON nodes, not opaque strings.
        </p>
      </section>

      <section id="ir" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">IR details &amp; versioning</h2>
        <p className="text-sm text-slate-600">
          The full v0.1 IR specification — including all node kinds, fields, and examples — lives in the Flux core repository alongside executable tests. The IR is versioned via <span className="font-mono">meta.version</span>; breaking changes require a new version and updated tests.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="https://github.com/cbassuarez/flux"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-800 transition-colors"
          >
            View IR spec on GitHub
          </a>
          <a
            href="https://github.com/cbassuarez/flux/tree/main/packages/core"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-sky-300"
          >
            Core package: @flux-lang/core
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
