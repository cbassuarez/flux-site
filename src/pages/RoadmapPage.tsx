export default function RoadmapPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-50">
          Roadmap
        </h1>
        <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
          Flux v0.1 focuses on the core language, IR, and a minimal runtime
          kernel. The roadmap below highlights some of the next concrete
          milestones.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 max-w-4xl">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Runtime: event rules
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Implementing <span className="font-mono">handleEvent</span> in the
            runtime kernel to support event-mode rules and event-type strings
            (e.g.{" "}
            <span className="font-mono">on = "input"</span>,
            <span className="font-mono">"click"</span>,
            <span className="font-mono">"hover"</span>).
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Richer static checks
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Extending <span className="font-mono">flux check</span> and the
            editor diagnostics to cover type flows, neighbor constraints, and
            grid layouts — catching more issues before runtime.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            In-browser playground
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            A small playground where you can type Flux code, inspect the IR, and
            run the runtime kernel in the browser to step the document over time.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Language v0.2
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Evolving the language surface and IR: extended runtime configuration,
            new rule modes, and additional topologies, while keeping the
            versioned IR contract explicit.
          </p>
        </div>
      </section>
    </div>
  );
}
