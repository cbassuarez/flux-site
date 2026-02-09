import type { ReactNode } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";
import { Seo } from "../components/Seo";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "now", label: "Now (v0.1)" },
  { id: "next", label: "Next" },
  { id: "later", label: "Later" },
  { id: "principles", label: "Principles" },
];

type StatusLabel = "Shipping" | "In progress" | "Planned" | "Exploring";

const statusClasses: Record<StatusLabel, string> = {
  Shipping:
    "border-[color:color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface-1))] text-[var(--fg)]",
  "In progress":
    "border-[color:color-mix(in_srgb,var(--accent-2)_28%,var(--border))] bg-[color:color-mix(in_srgb,var(--accent-2)_12%,var(--surface-1))] text-[var(--fg)]",
  Planned:
    "border-[color:color-mix(in_srgb,var(--fg)_18%,var(--border))] bg-[var(--surface-1)] text-[var(--muted)]",
  Exploring:
    "border-[color:color-mix(in_srgb,var(--muted)_22%,var(--border))] bg-[var(--surface-1)] text-[var(--muted)]",
};

function StatusPill({ status }: { status: StatusLabel }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        statusClasses[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function RoadmapCard({
  title,
  status,
  children,
}: {
  title: string;
  status: StatusLabel;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
        <StatusPill status={status} />
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );
}

function TrackSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function RoadmapPage() {
  return (
    <>
      <Seo
        title="Roadmap — Flux"
        description="Flux v0.1 focus areas and the roadmap for language, tooling, and editor workflows."
        canonicalPath="/roadmap"
      />
      <PageLayout
        title="Roadmap"
        subtitle="Flux v0.1 focus areas and what comes next."
        eyebrow={<FluxBrandStrip subtitle="roadmap" />}
        headerSlot={<PageTOC items={tocItems} />}
        contentClassName="max-w-6xl"
      >
        <section id="overview" className="space-y-6 scroll-mt-24">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-lg font-semibold text-[var(--fg)]">Overview</h2>
            <p className="text-sm sm:text-base leading-relaxed text-[var(--muted)]">
              Flux is a versioned spec, a canonical JSON IR contract, and a local-first toolchain that keeps the editor,
              CLI, and launcher in sync.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">What’s included in v0.1</div>
              <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>Launcher model: install via npm, update with <span className="font-mono">flux self update</span>, run via <span className="font-mono">flux</span>.</li>
                <li>CLI families: <span className="font-mono">open</span>, <span className="font-mono">new</span>, <span className="font-mono">edit</span>, <span className="font-mono">export</span>, <span className="font-mono">doctor</span>, <span className="font-mono">format</span>, <span className="font-mono">self</span>.</li>
                <li>Local-first editor workflow with local file access by default.</li>
                <li>Versioned core/spec/IR contract emphasis.</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Status labels</div>
              <div className="flex flex-wrap gap-2">
                <StatusPill status="Shipping" />
                <StatusPill status="In progress" />
                <StatusPill status="Planned" />
                <StatusPill status="Exploring" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Shipping = available in v0.1. In progress and Planned describe near-term work, while Exploring stays tentative.
              </p>
            </div>
          </div>
        </section>

      <section id="now" className="space-y-8 scroll-mt-24">
        <div className="space-y-2 max-w-3xl">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Now (v0.1)</h2>
          <p className="text-sm text-[var(--muted)]">
            The current release focuses on a stable launcher + CLI, local-first editor workflows, and a versioned IR contract.
          </p>
        </div>
        <TrackSection title="Toolchain & Distribution">
          <RoadmapCard title="Launcher install + update flow" status="Shipping">
            Install with <span className="font-mono">npm i -g @flux-lang/flux</span>, keep the toolchain current with <span className="font-mono">flux self update</span>.
          </RoadmapCard>
          <RoadmapCard title="Launcher entrypoint" status="Shipping">
            The <span className="font-mono">flux</span> command opens the local launcher UI and routes to local tools.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="CLI Workflows">
          <RoadmapCard title="Core command families" status="Shipping">
            Commands for <span className="font-mono">open</span>, <span className="font-mono">new</span>, <span className="font-mono">edit</span>, <span className="font-mono">export</span>, <span className="font-mono">doctor</span>, <span className="font-mono">format</span>, and <span className="font-mono">self</span>.
          </RoadmapCard>
          <RoadmapCard title="Diagnostics baseline" status="Shipping">
            Local diagnostics via <span className="font-mono">flux doctor</span> to validate environment and toolchain setup.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Editor Workflow">
          <RoadmapCard title="Local editor launch" status="Shipping">
            Launch the editor with <span className="font-mono">flux edit</span> and stay fully local with read/write access to local files.
          </RoadmapCard>
          <RoadmapCard title="Keyboard navigation" status="Shipping">
            Tab cycles panes, <span className="font-mono">Ctrl + K</span> opens the command palette, and <span className="font-mono">?</span> triggers search.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Language / Spec / IR">
          <RoadmapCard title="Versioned IR contract" status="Shipping">
            Flux IR snapshots are canonical JSON and versioned to keep tooling stable across releases.
          </RoadmapCard>
          <RoadmapCard title="Spec-aligned tooling" status="In progress">
            Aligning CLI + editor behavior with the published spec as v0.1 hardens.
          </RoadmapCard>
        </TrackSection>
      </section>

      <section id="next" className="space-y-8 scroll-mt-24">
        <div className="space-y-2 max-w-3xl">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Next (near-term)</h2>
          <p className="text-sm text-[var(--muted)]">
            Near-term improvements focus on polishing the launcher experience, sharpening workflows, and rounding out the IR contract.
          </p>
        </div>
        <TrackSection title="Toolchain & Distribution">
          <RoadmapCard title="Launcher UX polish" status="In progress">
            Streamlined first-run flow, clearer update notifications, and tighter version surfacing across tools.
          </RoadmapCard>
          <RoadmapCard title="Install diagnostics" status="Planned">
            Expanded checks for system prerequisites and local dependencies before launching the editor.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="CLI Workflows">
          <RoadmapCard title="Export + format quality" status="Planned">
            More complete export presets and formatting consistency that match the spec defaults.
          </RoadmapCard>
          <RoadmapCard title="Project scaffolds" status="Planned">
            Refine <span className="font-mono">flux new</span> templates for common document workflows and examples.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Editor Workflow">
          <RoadmapCard title="Guided transform clarity" status="Planned">
            Improve panel labeling, inline help, and next-step guidance without leaving the local editor.
          </RoadmapCard>
          <RoadmapCard title="Preview and diagnostics" status="Planned">
            Clearer inline diagnostics and preview cues that reflect the current IR snapshot.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Language / Spec / IR">
          <RoadmapCard title="IR schema coverage" status="Planned">
            Expand canonical JSON coverage for more node types while keeping versioned stability labels.
          </RoadmapCard>
          <RoadmapCard title="Spec documentation" status="Planned">
            Tighten spec wording, examples, and migration notes alongside each versioned IR update.
          </RoadmapCard>
        </TrackSection>
      </section>

      <section id="later" className="space-y-8 scroll-mt-24">
        <div className="space-y-2 max-w-3xl">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Later (exploratory)</h2>
          <p className="text-sm text-[var(--muted)]">
            Exploratory work stays intentionally tentative and will be scoped only after near-term goals ship.
          </p>
        </div>
        <TrackSection title="Toolchain & Distribution">
          <RoadmapCard title="Alternate distribution channels" status="Exploring">
            Packaging options beyond npm, depending on community demand and platform constraints.
          </RoadmapCard>
          <RoadmapCard title="Self-serve diagnostics reports" status="Exploring">
            Opt-in ways to share diagnostics snapshots for faster troubleshooting.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="CLI Workflows">
          <RoadmapCard title="Batch automation" status="Exploring">
            New CLI helpers for repeatable pipelines while preserving deterministic IR outputs.
          </RoadmapCard>
          <RoadmapCard title="Advanced export targets" status="Exploring">
            Evaluate additional export targets beyond the current PDF/HTML output flow.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Editor Workflow">
          <RoadmapCard title="Workflow extensions" status="Exploring">
            Optional integrations for editor extensions while keeping the core experience local-first.
          </RoadmapCard>
          <RoadmapCard title="Collaborative review" status="Exploring">
            Investigate review-friendly workflows that still treat the local editor as the source of truth.
          </RoadmapCard>
        </TrackSection>
        <TrackSection title="Language / Spec / IR">
          <RoadmapCard title="Language surface experiments" status="Exploring">
            Early exploration of v0.2 language features without committing to scope or timelines.
          </RoadmapCard>
          <RoadmapCard title="Renderer integrations" status="Exploring">
            Possible new render targets informed by the versioned IR contract.
          </RoadmapCard>
        </TrackSection>
      </section>

      <section id="principles" className="space-y-4 scroll-mt-24">
        <h2 className="text-lg font-semibold text-[var(--fg)]">Principles</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)] max-w-3xl">
          <li>Local-first by default — no hosted editor assumptions.</li>
          <li>Versioned IR contract with clear stability labels.</li>
          <li>Deterministic outputs that are CI-friendly.</li>
          <li>Thin tooling layers over the core spec and runtime.</li>
          <li>Truthful status communication over hype.</li>
        </ul>
      </section>
      </PageLayout>
    </>
  );
}
