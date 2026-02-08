import { useCallback, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";

const githubUrl = "https://github.com/cbassuarez/flux";
const docsUrl = "/docs";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install" },
  { id: "launcher", label: "Launcher" },
  { id: "cli", label: "CLI Tasks" },
  { id: "editor", label: "Editor" },
  { id: "core", label: "Core Library" },
  { id: "vscode", label: "VS Code" },
];

const launcherCommands = [
  {
    name: "open",
    description: "Open a Flux project or file in the launcher context.",
    usage: "flux open …",
  },
  {
    name: "new",
    description: "Create a new Flux project scaffold locally.",
    usage: "flux new …",
  },
  {
    name: "edit",
    description: "Open the local editor for the current project.",
    usage: "flux edit …",
  },
  {
    name: "export",
    description: "Export outputs from a Flux project locally.",
    usage: "flux export …",
  },
  {
    name: "doctor",
    description: "Run diagnostics on the local toolchain and setup.",
    usage: "flux doctor …",
  },
  {
    name: "format",
    description: "Format Flux source files consistently.",
    usage: "flux format …",
  },
  {
    name: "self",
    description: "Manage launcher-managed packages and updates.",
    usage: "flux self …",
  },
];

const cliTasks = [
  {
    title: "Create / initialize",
    description: "Bootstrap a new Flux project and defaults.",
    command: "flux new",
  },
  {
    title: "Open a project",
    description: "Open a local project in the launcher UI.",
    command: "flux open",
  },
  {
    title: "Edit",
    description: "Launch the local editor for a project.",
    command: "flux edit",
  },
  {
    title: "Export",
    description: "Export the current project output locally.",
    command: "flux export",
  },
  {
    title: "Diagnose",
    description: "Check local environment and project health.",
    command: "flux doctor",
  },
  {
    title: "Format",
    description: "Format Flux source files before commits.",
    command: "flux format",
  },
  {
    title: "Self-management",
    description: "Update the launcher-managed toolchain.",
    command: "flux self update",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch (error) {
      // silent fallback
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 shadow-sm transition hover:border-sky-400/60 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodePanel({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/95 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="code-panel text-xs leading-relaxed px-4 py-4 font-mono text-slate-100 overflow-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ScreenshotCard() {
  return (
    <div className="flex justify-center">
      <div className="group relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.15)] transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
          <div className="absolute inset-0 opacity-0 transition duration-700 motion-safe:group-hover:opacity-100">
            <div className="absolute -inset-y-8 left-0 w-1/2 -translate-x-full rotate-6 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70 transition duration-700 motion-safe:group-hover:translate-x-[220%]" />
          </div>
          <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
            Editor Preview
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-2 text-[11px] text-slate-500">
          <span>Editor (placeholder)</span>
          <span>Local-only</span>
        </div>
      </div>
    </div>
  );
}

export default function ToolingPage() {
  const getStartedUrl = docsUrl;

  return (
    <PageLayout
      title="Tooling"
      subtitle="Launcher, CLI, Core library, and editor integrations — one IR."
      eyebrow={<FluxBrandStrip subtitle="tooling" />}
      headerSlot={
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Requires Node ≥ 20
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={getStartedUrl}
              className="inline-flex items-center justify-center rounded-full flux-gradient-bg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-[0_10px_30px_rgba(0,205,254,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Get started
            </a>
            <a
              href={docsUrl}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Docs
            </a>
            <a
              href={githubUrl}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
          <PageTOC items={tocItems} />
        </div>
      }
    >
      <section id="overview" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-light text-slate-900">Tooling From Day One</h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Flux is a language kit: a core library, CLI, and editor tooling that share the same IR. Everything runs
          locally, so there’s no cloud requirement.
        </p>
      </section>

      <section id="install" className="space-y-5 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">One Install, Everything</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The launcher stays lightweight and manages the rest of the toolchain on your machine.
          </p>
        </div>
        <div className="grid gap-4">
          <CodePanel label="Install" code="npm i -g @flux-lang/flux" />
          <CodePanel label="Update + Launch" code={`flux self update\nflux`} />
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>Launcher stays small; it installs and updates the Flux toolchain safely.</li>
          <li>
            <span className="font-mono">flux self update</span> updates all managed packages.
          </li>
          <li>
            <span className="font-mono">flux</span> opens the launcher UI.
          </li>
        </ul>
      </section>

      <section id="launcher" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">Launcher (flux)</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Running <span className="font-mono">flux</span> opens the launcher UI. From there you can open projects,
            create new work, and manage the toolchain — all locally.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Keyboard Shortcuts</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <span className="font-mono">Tab</span> → focus between panes
              </li>
              <li>
                <span className="font-mono">Ctrl+K</span> → command palette
              </li>
              <li>
                <span className="font-mono">?</span> → search
              </li>
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {launcherCommands.map((command) => (
              <div key={command.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {command.name}
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{command.description}</p>
                <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-700">
                  {command.usage}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cli" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">CLI Tasks (Scriptable)</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The CLI is task-oriented and designed for scripting, automation, and quick project work.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cliTasks.map((task) => (
            <div key={task.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">{task.title}</div>
              <p className="mt-1 text-sm text-slate-600">{task.description}</p>
              <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-700">
                {task.command}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">All commands run locally; safe for CI.</p>
        <CodePanel
          label="Minimal CI"
          code={`npm i -g @flux-lang/flux\nflux self update\nflux doctor`}
        />
      </section>

      <section id="editor" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">Editor</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The editor runs locally. Launch it by running <span className="font-mono">flux</span> and selecting
            <span className="font-mono"> edit</span> from the palette, or call <span className="font-mono">flux edit</span>
            directly.
          </p>
        </div>
        <ScreenshotCard />
      </section>

      <section id="core" className="space-y-5 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">Core Library: @flux-lang/core</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Core is the source of truth for the AST/IR, parser, and checks. The CLI and editor are layered on top.
          </p>
        </div>
        <CodePanel label="Install" code="npm i @flux-lang/core" />
        <CodePanel
          label="TypeScript"
          code={`import { parseDocument, initRuntimeState, runDocstepOnce } from "@flux-lang/core";

const source = \`document {
  meta {
    title   = "Example";
    version = "0.1.0";
  }
  // ...
}\`;

const doc = parseDocument(source);       // FluxDocument
const state0 = initRuntimeState(doc);    // RuntimeState
const state1 = runDocstepOnce(doc, state0);`}
        />
      </section>

      <section id="vscode" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-slate-900">VS Code Extension</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The VS Code extension is focused on fast feedback for <span className="font-mono">.flux</span> files.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Today</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Syntax highlighting for Flux files.</li>
              <li>Diagnostics powered by the core parser + checks.</li>
              <li>Show IR command for the active file.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Soon</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Marketplace listing (live on VS Code Marketplace).</li>
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Install From Source</div>
          <ol className="mt-3 list-decimal pl-5 text-sm text-slate-600 space-y-1">
            <li>
              Clone the repo and open <span className="font-mono">packages/vscode-flux</span> (
              <a
                href="https://github.com/cbassuarez/flux/tree/main/packages/vscode-flux"
                className="text-sky-700 hover:text-sky-900"
                target="_blank"
                rel="noreferrer"
              >
                source folder
              </a>
              ).
            </li>
            <li>
              Install dependencies and build: <span className="font-mono">npm install</span>, then
              <span className="font-mono"> npm run build</span>.
            </li>
            <li>
              In VS Code, use “Developer: Install Extension from Location...” and select the extension folder.
            </li>
          </ol>
        </div>
      </section>
    </PageLayout>
  );
}
