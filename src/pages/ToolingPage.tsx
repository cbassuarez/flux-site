export default function ToolingPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-50">
          Tooling
        </h1>
        <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
          Flux is built as a language kit: a core library, a CLI, and editor
          integrations that all share the same IR.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Core library: @flux-lang/core
        </h2>
        <p className="text-sm text-zinc-300">
          The core package exposes the AST types, parser, and runtime kernel.
        </p>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-zinc-100 overflow-auto">
          <code>{`npm install @flux-lang/core`}</code>
        </pre>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-zinc-100 overflow-auto">
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

      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          CLI: flux parse / flux check
        </h2>
        <p className="text-sm text-zinc-300">
          The CLI wraps the same parser and static checks in a simple command
          line interface.
        </p>
        <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-zinc-100 overflow-auto">
          <code>{`npx @flux-lang/cli parse example.flux
npx @flux-lang/cli check example.flux`}</code>
        </pre>
        <p className="text-xs text-zinc-400">
          <span className="font-mono">flux parse</span> prints the IR as JSON or
          NDJSON, while <span className="font-mono">flux check</span> runs basic
          static checks (grid references, neighbor usage, runtime timers).
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Editor integration
        </h2>
        <p className="text-sm text-zinc-300">
          A VS Code extension for Flux is under active development. It provides:
        </p>
        <ul className="mt-2 text-sm text-zinc-300 list-disc list-inside space-y-1">
          <li>Syntax highlighting for <span className="font-mono">.flux</span> files.</li>
          <li>
            On-the-fly diagnostics powered by{" "}
            <span className="font-mono">@flux-lang/core</span>.
          </li>
          <li>
            A command to show the current document&apos;s IR as JSON in a side
            view.
          </li>
        </ul>
        <p className="text-xs text-zinc-400 mt-2">
          VS Code marketplace listing coming soon. In the meantime, you can
          build and install the extension from source.
        </p>
      </section>
    </div>
  );
}
