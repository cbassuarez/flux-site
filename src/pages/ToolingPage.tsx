import { useCallback, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";
import { Seo } from "../components/Seo";
import { Badge, Button, ButtonAnchor } from "../components/ui/Button";

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
    <Button
      type="button"
      onClick={handleCopy}
      variant="badge"
      size="sm"
      className="normal-case tracking-[0.12em] bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--fg)]"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CodePanel({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="code-panel text-xs leading-relaxed px-4 py-4 font-mono text-[var(--fg)] overflow-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ScreenshotCard() {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="flex justify-center">
      <div className="group relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_24px_60px_rgba(15,23,42,0.15)] transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[var(--surface-1)] via-[var(--surface-0)] to-[var(--surface-2)]">
          {imgOk ? (
            <>
              <img
                src="/editor.png"
                alt="Flux Editor screenshot"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImgOk(false)}
              />
              <div className="pointer-events-none absolute inset-0 border border-[var(--border)] opacity-60" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-[0.3em] text-[var(--muted)]">
              Editor Preview
            </div>
          )}
          <div className="absolute inset-0 opacity-0 transition duration-700 motion-safe:group-hover:opacity-100">
            <div className="absolute -inset-y-8 left-0 w-1/2 -translate-x-full rotate-6 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70 transition duration-700 motion-safe:group-hover:translate-x-[220%]" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--muted)]">
          <span>{imgOk ? "Editor" : "Editor (placeholder)"}</span>
          <span>Local-only</span>
        </div>
      </div>
    </div>
  );
}

export default function ToolingPage() {
  const getStartedUrl = docsUrl;

  return (
    <>
      <Seo
        title="Tooling — Flux"
        description="Install the launcher, use the Flux CLI, and connect editor tooling with the shared IR."
        canonicalPath="/tooling"
      />
      <PageLayout
        title="Tooling"
        subtitle="Launcher, CLI, Core library, and editor integrations — one IR."
        eyebrow={<FluxBrandStrip subtitle="tooling" />}
        headerSlot={
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Requires Node ≥ 20
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonAnchor href={getStartedUrl} variant="glass" size="sm">
                Get started
              </ButtonAnchor>
              <ButtonAnchor href={docsUrl} variant="solid" size="sm">
                Docs
              </ButtonAnchor>
              <ButtonAnchor href={githubUrl} variant="ghost" size="sm" target="_blank" rel="noreferrer">
                GitHub
              </ButtonAnchor>
            </div>
            <PageTOC items={tocItems} />
          </div>
        }
      >
        <section id="overview" className="space-y-3 scroll-mt-24">
          <h2 className="text-lg font-light text-[var(--fg)]">Tooling From Day One</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            Flux is a language kit: a core library, CLI, and editor tooling that share the same IR. Everything runs
            locally, so there’s no cloud requirement.
          </p>
        </section>

      <section id="install" className="space-y-5 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-[var(--fg)]">One Install, Everything</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            The launcher stays lightweight and manages the rest of the toolchain on your machine.
          </p>
        </div>
        <div className="grid gap-4">
          <CodePanel label="Install" code="npm i -g @flux-lang/flux" />
          <CodePanel label="Update + Launch" code={`flux self update\nflux`} />
        </div>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
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
          <h2 className="text-lg font-light text-[var(--fg)]">Launcher (flux)</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            Running <span className="font-mono">flux</span> opens the launcher UI. From there you can open projects,
            create new work, and manage the toolchain — all locally.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Keyboard Shortcuts
            </div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
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
              <div
                key={command.name}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {command.name}
                </div>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{command.description}</p>
                <Badge className="mt-3 normal-case bg-[var(--surface-2)] text-[11px] tracking-[0.16em] font-mono text-[var(--fg)]">
                  {command.usage}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cli" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-[var(--fg)]">CLI Tasks (Scriptable)</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            The CLI is task-oriented and designed for scripting, automation, and quick project work.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cliTasks.map((task) => (
            <div
              key={task.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm"
            >
              <div className="text-sm font-semibold text-[var(--fg)]">{task.title}</div>
              <p className="mt-1 text-sm text-[var(--muted)]">{task.description}</p>
              <Badge className="mt-2 normal-case bg-[var(--surface-2)] text-[11px] tracking-[0.16em] font-mono text-[var(--fg)]">
                {task.command}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">All commands run locally; safe for CI.</p>
        <CodePanel
          label="Minimal CI"
          code={`npm i -g @flux-lang/flux\nflux self update\nflux doctor`}
        />
      </section>

      <section id="editor" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-[var(--fg)]">Editor</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            The editor runs locally. Launch it by running <span className="font-mono">flux</span> and selecting
            <span className="font-mono"> edit</span> from the palette, or call <span className="font-mono">flux edit</span>
            directly.
          </p>
        </div>
        <ScreenshotCard />
      </section>

      <section id="core" className="space-y-5 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-lg font-light text-[var(--fg)]">Core Library: @flux-lang/core</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
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
          <h2 className="text-lg font-light text-[var(--fg)]">VS Code Extension</h2>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            The VS Code extension is focused on fast feedback for <span className="font-mono">.flux</span> files.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Today</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Syntax highlighting for Flux files.</li>
              <li>Diagnostics powered by the core parser + checks.</li>
              <li>Show IR command for the active file.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Soon</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Marketplace listing (live on VS Code Marketplace).</li>
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Install From Source
          </div>
          <ol className="mt-3 list-decimal pl-5 text-sm text-[var(--muted)] space-y-1">
            <li>
              Clone the repo and open <span className="font-mono">packages/vscode-flux</span> (
              <a
                href="https://github.com/cbassuarez/flux/tree/main/packages/vscode-flux"
                className="text-[var(--accent)] hover:text-[var(--accent-2)]"
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
    </>
  );
}
