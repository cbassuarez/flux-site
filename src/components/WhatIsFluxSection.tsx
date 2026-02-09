import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { seededIndex } from "./hero/determinism";
import { SiteContainer } from "./SiteContainer";
import { isPrerender } from "../lib/prerender";

const ALT_HEADLINES = [
  "Documents that can transform.",
  "A language for authored change.",
  "Write the document once. Let it evolve.",
];

const REFRESH_OPTIONS = [
  { label: "docstep", value: "docstep" },
  { label: "every(1.0s)", value: "1000" },
  { label: "every(1.5s)", value: "1500" },
  { label: "every(2.0s)", value: "2000" },
];

const TRANSITION_OPTIONS = ["fade", "wipe", "flash", "none"] as const;

type TransitionType = (typeof TRANSITION_OPTIONS)[number];

function formatRefresh(docstepMs: number, running: boolean) {
  if (!running) return "docstep";
  const seconds = (docstepMs / 1000).toFixed(1);
  return `every(${seconds}s)`;
}

function formatTransition(type: TransitionType, durationMs: number) {
  if (type === "none") return "none";
  return `${type}(duration=${durationMs}ms, ease=\"inOut\")`;
}

function headlineVariants(type: TransitionType) {
  switch (type) {
    case "wipe":
      return {
        initial: { opacity: 0, clipPath: "inset(0 0 0 100%)" },
        animate: { opacity: 1, clipPath: "inset(0 0 0 0)" },
      };
    case "flash":
      return {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
      };
    case "none":
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };
  }
}

export function WhatIsFluxSection() {
  const prerenderMode = isPrerender();
  const shouldReduceMotion = useReducedMotion();
  const [docstep, setDocstep] = useState(0);
  const [docstepMs, setDocstepMs] = useState(1000);
  const [transitionMs, setTransitionMs] = useState(220);
  const [transitionType, setTransitionType] = useState<TransitionType>("fade");
  const [running, setRunning] = useState(!prerenderMode);
  const seed = 42;

  useEffect(() => {
    if (shouldReduceMotion || prerenderMode) {
      setRunning(false);
      setTransitionType("none");
    }
  }, [prerenderMode, shouldReduceMotion]);

  useEffect(() => {
    if (prerenderMode || !running || docstepMs <= 0) return undefined;
    const interval = window.setInterval(() => {
      setDocstep((value) => value + 1);
    }, docstepMs);
    return () => window.clearInterval(interval);
  }, [prerenderMode, running, docstepMs]);

  const headline = useMemo(() => {
    const index = seededIndex(seed, docstep, ALT_HEADLINES.length, 11);
    return ALT_HEADLINES[index];
  }, [docstep, seed]);

  const transitionDuration = shouldReduceMotion || transitionType === "none" ? 0 : transitionMs / 1000;
  const transition = { duration: transitionDuration, ease: [0.4, 0, 0.2, 1] };
  const variants = headlineVariants(transitionType);

  return (
    <section
      className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--surface-0)] py-12"
      data-testid="what-is-flux"
      data-docstep={docstep}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <SiteContainer className="relative px-2 sm:px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)]/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              What is Flux?
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-light leading-[1.15] tracking-[-0.02em] text-[var(--fg)] sm:text-4xl">
                A Flux document is a living specification.
                <motion.span
                  key={headline}
                  className="mt-2 block text-base font-medium text-[var(--muted)] sm:text-lg"
                  initial={variants.initial}
                  animate={variants.animate}
                  transition={transition}
                  data-testid="headline-slot"
                >
                  {headline}
                </motion.span>
              </h2>
              <p className="text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                It describes structure, content, and transformation in one place—then compiles into stable outputs you
                can render, export, and automate. Local-first by design: your files stay yours, and the same document
                can be edited interactively or scripted in CI.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[var(--fg)] sm:text-base">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>
                  <span className="font-semibold">Declare:</span> compose pages, layout, and semantics with a typed
                  document model.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-semibold">Transform:</span> generators + slots + docsteps turn one spec into
                  many precise variants.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>
                  <span className="font-semibold">Render:</span> produce consistent outputs (web/print/export) from the
                  same IR.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-semibold">Automate:</span> scriptable tooling makes builds reproducible,
                  diffable, and boring-in-a-good-way.
                </span>
              </li>
            </ul>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              One substrate. Many projections.
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-3 text-[11px] font-mono text-[var(--muted)]">
              <label className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
                <span>refresh:</span>
                <select
                  className="bg-transparent text-[11px] text-[var(--fg)] outline-none"
                  value={running ? String(docstepMs) : "docstep"}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "docstep") {
                      setRunning(false);
                    } else {
                      setRunning(true);
                      setDocstepMs(Number(value));
                    }
                  }}
                >
                  {REFRESH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
                <span>transition:</span>
                <select
                  className="bg-transparent text-[11px] text-[var(--fg)] outline-none"
                  value={transitionType}
                  onChange={(event) => setTransitionType(event.target.value as TransitionType)}
                >
                  {TRANSITION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span>(</span>
                <span>duration=</span>
                <input
                  className="w-12 bg-transparent text-[11px] text-[var(--fg)] outline-none"
                  type="number"
                  min={0}
                  max={1200}
                  step={20}
                  value={transitionMs}
                  onChange={(event) => setTransitionMs(Number(event.target.value))}
                />
                <span>ms)</span>
              </label>
              <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
                seed: {seed}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium text-[var(--fg)] transition hover:border-[var(--ring)]"
                  onClick={() => setDocstep((value) => value + 1)}
                >
                  Step
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium text-[var(--fg)] transition hover:border-[var(--ring)]"
                  onClick={() => setRunning((value) => !value)}
                >
                  Auto-run {running ? "on" : "off"}
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--muted)]">
              refresh: {formatRefresh(docstepMs, running)} · transition: {formatTransition(transitionType, transitionMs)}
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                <span>Flux document</span>
                <span className="h-px w-16 bg-gradient-to-r from-cyan-400/60 via-emerald-400/60 to-transparent" />
              </div>
              <pre className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[12px] leading-relaxed text-[var(--fg)]">
                <code>
                  {`doc Packet {
  slot headline refresh: docstep
  layout pages = 1
  render { html, pdf }
}`}
                </code>
              </pre>
              <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  IR-backed
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  Deterministic runtime (seed/docstep)
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Render", "Export", "Automate"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-[var(--fg)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
