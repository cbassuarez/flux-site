import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "core", label: "Core library" },
  { id: "cli", label: "CLI" },
  { id: "editor", label: "Editor" },
];

export default function ToolingPage() {
  return (
    <PageLayout
      title="Tooling"
      subtitle="Language kit: core library, CLI, and editor integrations."
      eyebrow={<FluxBrandStrip subtitle="tooling" />}
      headerSlot={<PageTOC items={tocItems} />}
    >
      <section id="overview" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Tooling from day one</h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Flux is built as a language kit: a core library, a CLI, and editor integrations that all share the same IR.
        </p>
      </section>

      <section id="core" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Core library: @flux-lang/core</h2>
        <p className="text-sm text-slate-600">The core package exposes the AST types, parser, and runtime kernel.</p>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-slate-800 overflow-auto border border-slate-200 bg-slate-50 rounded-xl">
          <code>{`npm install @flux-lang/core`}</code>
        </pre>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-slate-800 overflow-auto border border-slate-200 bg-slate-50 rounded-xl">
          <code>{`import { parseDocument, initRuntimeState, runDocstepOnce } from "@flux-lang/core";

const source = \`document {
  meta {
    title   = "Example";
    version = "0.1.0";
  }
  // ...
}\`;

const doc = parseDocument(source);       // FluxDocument
const state0 = initRuntimeState(doc);    // RuntimeState
const state1 = runDocstepOnce(doc, state0);`}</code>
        </pre>
      </section>

      <section id="cli" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">CLI: flux parse / flux check</h2>
        <p className="text-sm text-slate-600">
          The CLI wraps the same parser and static checks in a simple command line interface.
        </p>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-slate-800 overflow-auto border border-slate-200 bg-slate-50 rounded-xl">
          <code>{`npx @flux-lang/cli parse example.flux
npx @flux-lang/cli check example.flux`}</code>
        </pre>
        <p className="text-xs text-slate-500">
          <span className="font-mono">flux parse</span> prints the IR as JSON or NDJSON, while <span className="font-mono">flux check</span> runs basic static checks (grid references, neighbor usage, runtime timers).
        </p>
      </section>

      <section id="editor" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Editor integration</h2>
        <p className="text-sm text-slate-600">
          A VS Code extension for Flux is under active development. It provides:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>
            Syntax highlighting for <span className="font-mono">.flux</span> files.
          </li>
          <li>
            On-the-fly diagnostics powered by <span className="font-mono">@flux-lang/core</span>.
          </li>
          <li>
            A command to show the current document&apos;s IR as JSON in a side view.
          </li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">
          VS Code marketplace listing coming soon. In the meantime, you can build and install the extension from source.
        </p>
      </section>
    </PageLayout>
  );
}
