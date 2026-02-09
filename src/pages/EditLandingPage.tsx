import { Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { buttonClasses } from "../components/ui/Button";
import { Seo } from "../components/Seo";

export default function EditLandingPage() {
  return (
    <>
      <Seo
        title="Flux Editor — Flux"
        description="Launch the local-first Flux editor and learn how to run it on your machine."
        canonicalPath="/edit"
      />
      <PageLayout
        title="Flux Editor (Local)"
        subtitle="The editor runs on your machine. This page explains how to launch it."
        headerSlot={
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            Requires Node ≥ 20
          </div>
        }
        contentClassName="max-w-6xl"
      >
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Web docs • Not the editor UI
              </div>
              <h2 className="mt-3 text-base font-semibold text-[var(--fg)]">Here by accident?</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                This site does not host an in-browser editor. The Flux editor is local-first and runs on your machine.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">You probably want…</div>
                <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
                  <li>
                    <span className="font-semibold text-[var(--fg)]">Docs</span> — language + spec
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--fg)]">Tooling</span> — install, CLI tasks, editor overview
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--fg)]">GitHub</span> — source, issues, releases
                  </li>
                </ul>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Trying to edit a <span className="font-mono">.flux</span> file right now? Install CLI → run{" "}
                <span className="font-mono">flux edit</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/tooling"
                  className={buttonClasses({
                    variant: "primary",
                    size: "md",
                    className: "flux-gradient-bg text-white",
                  })}
                >
                  Tooling / Install
                </Link>
                <Link to="/docs" className={buttonClasses({ variant: "secondary", size: "md" })}>
                  Docs
                </Link>
                <a
                  href="https://github.com/cbassuarez/flux"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "ghost", size: "md" })}
                >
                  GitHub
                </a>
              </div>
            </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[var(--fg)]">Here on purpose? Launch the editor</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              The Flux editor is always local-first. It runs on your machine and reads/writes local files only.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--fg)]">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Install</div>
                <code className="mt-2 block font-mono">npm i -g @flux-lang/flux</code>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--fg)]">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Launch</div>
                <code className="mt-2 block font-mono">flux self update</code>
                <code className="mt-1 block font-mono">flux</code>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  The <span className="font-mono">flux</span> command opens the launcher and editor locally, when you edit a file or create a flux file.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Keyboard cheatsheet</div>
              <ul className="mt-2 space-y-1 text-xs text-[var(--fg)]">
                <li>
                  <kbd className="rounded bg-[var(--surface-3)] px-2 py-0.5 font-mono">Tab</kbd> Focus / cycle panes
                </li>
                <li>
                  <kbd className="rounded bg-[var(--surface-3)] px-2 py-0.5 font-mono">Ctrl + K</kbd> Command palette
                </li>
                <li>
                  <kbd className="rounded bg-[var(--surface-3)] px-2 py-0.5 font-mono">?</kbd> Search
                </li>
              </ul>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--muted)]">
            <div>
              Troubleshooting: run <span className="font-mono text-[var(--fg)]">flux doctor</span> to verify your local setup.
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Node ≥ 20 required</div>
          </div>
        </section>
      </div>
      </PageLayout>
    </>
  );
}
