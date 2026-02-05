import { PageLayout } from "../components/PageLayout";
import { PageTOC } from "../components/PageTOC";
import { FluxBrandStrip } from "../components/branding/FluxBrandStrip";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "model", label: "Mental model" },
  { id: "source", label: ".flux essentials" },
  { id: "runtime", label: "Runtime IR snapshot" },
  { id: "slots", label: "Slots: reserve + fit + refresh" },
  { id: "assets", label: "Assets & banks" },
  { id: "rendering", label: "Rendering pipeline" },
  { id: "cli", label: "CLI cookbook" },
  { id: "safety", label: "Safety model" },
];

function CodePanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">{label}</div>
      </div>
      <pre className="code-panel text-xs leading-relaxed p-4 font-mono text-slate-800 overflow-auto bg-white">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  const cliQuickstart = `# Start the viewer (offline local web UI)
flux view examples/viewer-demo.flux --docstep-ms 700 --seed 1

# Step the runtime (deterministic snapshot by docstep)
flux step examples/viewer-demo.flux --n 1 --seed 1

# Advance wallclock time (timestep) without changing docstep
flux tick examples/viewer-demo.flux --seconds 2 --seed 1

# Export PDF (adjust flags to match your CLI)
flux export examples/viewer-demo.flux --out ./viewer-demo.pdf`;

  const mentalModel = `(.flux source)
   ↓ parse + evaluate
(runtime snapshot / IR)
  { seed, time, docstep, assets, body }
   ↓ render to HTML/CSS
(paged layout)
   ↓

Live mode (viewer):
  advance docstep/time
   ↓ re-evaluate
  compute slot patches
   ↓ patch only slot DOM nodes
  (no repaginate; page breaks stay stable)`;

  const fluxEssentials = `# minimal sketch (illustrative)
# - inline_slot is layout-locked (fixed width) + fit policy
# - slot is layout-locked (fixed geometry) + fit policy
# - assets.pick uses string tags

meta { title = "Viewer Demo"; version = "0.2.0"; }

assets bank demoImages {
  from "viewer-assets/*.(svg|png|jpg)"
  tags ["swap", "demo"]
}

page p1 {
  section intro {
    text paragraph1 {
      "Flux viewer demo shows "
      inline_slot word1 { reserve = fixedWidth(9ch); fit = ellipsis; }
        text { @choose(["moving","adaptive","dynamic","live","procedural","stochastic"]) }
      " text updates without reflow."
    }

    text paragraph2 {
      "This paragraph remains fixed while the inline slot updates on each docstep."
    }
  }

  section hero {
    slot imageSlot { reserve = fixed(360px, 240px); fit = scaleDown; }
      image heroImg { asset = @assets.pick(tags=["swap"]); }
    text caption { "Image slot swaps per docstep without changing layout." }
  }
}`;

  const runtimeShape = `interface FluxRuntimeSnapshot {
  meta: { version: string; title?: string };
  seed: number;
  time: number;     // seconds (wallclock-driven timestep)
  docstep: number;  // integer step (docstep-driven iteration)
  assets: Array<{
    id: string;
    name: string;
    kind: "image" | "font" | "data" | string;
    path: string;
    tags?: string[];
    weight?: number;
    source?: { type: "bank"; name: string } | { type: string };
  }>;
  body: FluxNode[];
}

type FluxNode =
  | { id: string; kind: "page"; props?: any; children: FluxNode[] }
  | { id: string; kind: "section"; props?: any; children: FluxNode[] }
  | { id: string; kind: "text"; props?: { content?: string }; children: FluxNode[] }
  | { id: string; kind: "inline_slot"; props: { reserve: string; fit: string; refresh?: string }; children: FluxNode[] }
  | { id: string; kind: "slot"; props: { reserve: string; fit: string; refresh?: string }; children: FluxNode[] }
  | { id: string; kind: "image"; props: { asset: null | AssetRef }; children: [] }
  | { id: string; kind: string; props?: any; children: FluxNode[] };

type AssetRef = { kind: "asset"; id: string; path: string };`;

  const slotInvariant = `Invariant:
Anything that changes during playback must be inside a layout-locked slot
(with reserved geometry + a declared fit policy).`;

  const slotPolicies = `Slots enforce stability by reserving geometry:
- inline_slot: reserve fixedWidth(...) (e.g. 9ch)
- slot: reserve fixed(W,H) (e.g. 360×240)

If new content doesn't fit, apply fit policy:
- clip | ellipsis | shrink | scaleDown`;

  const assetNotes = `Assets come from banks (glob folders) and are addressable via tags.
Selections are deterministic given runtime parameters (seed/docstep/time),
so the same inputs always yield the same outputs.`;

  return (
    <PageLayout
      title="Flux Docs"
      subtitle="Deterministic, paged documents with live-evolving slots."
      eyebrow={<FluxBrandStrip subtitle="docs" />}
      headerSlot={<PageTOC items={tocItems} />}
    >
      {/* Hero rail layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <section id="overview" className="space-y-4 scroll-mt-24">
            <div className="flex flex-wrap gap-2">
              <Chip>v0.2.0</Chip>
              <Chip>offline-first</Chip>
              <Chip>seeded</Chip>
              <Chip>paged HTML + PDF</Chip>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              Flux is a <span className="font-semibold">deterministic</span>,{" "}
              <span className="font-semibold">paged</span> document system.
              A <span className="font-mono">.flux</span> source file evaluates into a runtime snapshot
              parameterized by <span className="font-mono">seed</span>,{" "}
              <span className="font-mono">docstep</span>, and{" "}
              <span className="font-mono">time</span>. The viewer renders that snapshot as
              PDF-like paged HTML and can export an equivalent PDF.
            </p>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              Live evolution is constrained by{" "}
              <span className="font-semibold">layout-locked slots</span> (
              <span className="font-mono">slot</span>,{" "}
              <span className="font-mono">inline_slot</span>) with reserved geometry and fit policies.
              That’s what lets Flux update text/images over time{" "}
              <span className="font-semibold">without repaginating</span> or shifting the surrounding layout.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="/editor"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                Open Viewer Demo
              </a>
              <a
                href="https://github.com/cbassuarez/flux"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 transition-colors"
              >
                Source (GitHub)
              </a>
            </div>
          </section>
        </div>

        {/* Sticky right rail: Quickstart + invariants */}
        <aside className="lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-24">
            <CodePanel label="CLI quickstart">{cliQuickstart}</CodePanel>
            <Callout title="Core invariant (slots)">
              <div className="font-mono text-xs whitespace-pre-wrap text-slate-800">{slotInvariant}</div>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                This is how Flux preserves stable pagination while content evolves.
              </div>
            </Callout>
            <Callout title="Determinism (seed · docstep · time)">
              <div className="text-xs text-slate-700 leading-relaxed">
                Flux runs like a deterministic document runtime. Given the same{" "}
                <span className="font-mono">seed</span>,{" "}
                <span className="font-mono">docstep</span>,{" "}
                <span className="font-mono">time</span>, and inputs, you get the same snapshot and the same pages.
              </div>
            </Callout>
          </div>
        </aside>
      </div>

      {/* Mental model */}
      <section id="model" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Mental model</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Flux has a small, explicit pipeline: source → runtime snapshot → paged render.
          Live playback advances <span className="font-mono">docstep</span> and/or <span className="font-mono">time</span>,
          re-evaluates, then patches only slot nodes.
        </p>
        <CodePanel label="Pipeline">{mentalModel}</CodePanel>
      </section>

      {/* .flux essentials */}
      <section id="source" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">.flux essentials</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          You don’t need the full grammar to understand Flux’s contract. The key pieces are:
          pages/sections/text, layout-locked slots, and asset selection via banks.
        </p>
        <CodePanel label=".flux (minimal demo)">{fluxEssentials}</CodePanel>
        <p className="text-xs text-slate-500 leading-relaxed">
          Notes: this snippet is a minimal sketch. Slot geometry (<span className="font-mono">reserve</span>) and overflow behavior
          (<span className="font-mono">fit</span>) are required for anything that changes during playback.
          Asset tags are strings: <span className="font-mono">tags=["swap"]</span>.
        </p>
      </section>

      {/* Runtime snapshot */}
      <section id="runtime" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Runtime IR snapshot</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Flux evaluates a document into a canonical runtime snapshot. This is what{" "}
          <span className="font-mono">flux step</span> and <span className="font-mono">flux tick</span> return.
          The viewer renders this snapshot and uses it to compute slot patches during playback.
        </p>
        <CodePanel label="Runtime snapshot shape (v0.2)">{runtimeShape}</CodePanel>
      </section>

      {/* Slots */}
      <section id="slots" className="mt-10 space-y-4 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Slots: reserve + fit + refresh</h2>

        <Callout title="Invariant">
          Anything that changes during playback must render inside a{" "}
          <span className="font-semibold">layout-locked slot</span> with declared geometry and a fit policy.
          This is what keeps pagination stable and prevents “neighbor reflow.”
        </Callout>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CodePanel label="Slot policies">{slotPolicies}</CodePanel>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-900">Refresh</div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Flux supports evolution driven by discrete <span className="font-mono">docstep</span> and/or wallclock{" "}
              <span className="font-mono">time</span>. In the viewer, playback advances these parameters and applies slot patches.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                <span className="font-mono">docstep</span>: best for discrete edition states (step-by-step evolution).
              </li>
              <li>
                <span className="font-mono">time</span>: best for “watch it evolve” playback and timed refresh behavior.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Assets */}
      <section id="assets" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Assets &amp; banks</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Assets are discovered from bank folders (glob patterns) and can be queried by tags. Picks are deterministic
          with respect to the runtime parameters so documents are reproducible.
        </p>
        <CodePanel label="Assets (conceptual)">{assetNotes}</CodePanel>
        <p className="text-xs text-slate-500 leading-relaxed">
          In practice you’ll see each resolved asset appear in the runtime snapshot with a stable{" "}
          <span className="font-mono">id</span>, <span className="font-mono">path</span>, and{" "}
          <span className="font-mono">source</span> metadata.
        </p>
      </section>

      {/* Rendering pipeline */}
      <section id="rendering" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Rendering pipeline</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          The viewer renders paged HTML (paper-like pages) and can export PDF. During live playback, it advances{" "}
          <span className="font-mono">docstep</span>/<span className="font-mono">time</span>, re-evaluates, and patches only
          slot nodes—avoiding full repagination.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-900">Invariants in the renderer</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            <li>Pagination happens on the full snapshot → produces stable pages.</li>
            <li>Live updates patch only the DOM subtree for slot/inline_slot nodes.</li>
            <li>Slot geometry is reserved; overflow is handled by fit policy.</li>
          </ul>
        </div>
      </section>

      {/* CLI cookbook */}
      <section id="cli" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">CLI cookbook</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Flux is designed to be verifiable from the terminal: view, step, tick, export. These are the fastest ways to
          understand the runtime.
        </p>
        <CodePanel label="CLI">{cliQuickstart}</CodePanel>
      </section>

      {/* Safety */}
      <section id="safety" className="mt-10 space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-slate-900">Safety model</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Flux documents are treated as untrusted by default. Viewer behavior should be safe-by-default:
          no arbitrary remote fetch, no script execution from documents, and strict handling of assets and paths.
          Remote assets (if supported) should require explicit opt-in allowlisting.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="https://github.com/cbassuarez/flux"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            Flux repo
          </a>
          <a
            href="https://github.com/cbassuarez/flux/tree/main/packages/core"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            Core package
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
