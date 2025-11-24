import HeroDemo from "../components/HeroDemo";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="mt-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-50">
          Flux is a score language for{" "}
          <span className="text-fluxBlue">
            procedurally evolving music scores and parts
          </span>
          .
        </h1>
        <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
          Flux treats a musical score as a living system: grids of cells, rules,
          and runtime behavior that can evolve over time. The core abstraction
          is a well-defined JSON intermediate representation —
          <span className="font-mono"> FluxDocument</span> — designed to be
          parsed, inspected, and transformed by tools.
        </p>
        <p className="mt-3 text-sm sm:text-base text-zinc-400">
          This site introduces the Flux v0.1 IR, the language surface, and the
          tooling stack: a core parser/runtime, a CLI, and editor integrations.
        </p>
      </section>

      <HeroDemo />

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Language-first design
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Flux is specified in terms of a typed AST and a canonical JSON IR.
            The grammar is versioned, tested, and designed to be embedded inside
            other tools — not just a one-off DSL.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            A real runtime kernel
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            The v0.1 runtime kernel supports docstep rules, a grid topology, and
            neighbor-aware dynamics via <span className="font-mono">neighbors.all</span>{" "}
            and <span className="font-mono">neighbors.orth</span>.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Tooling from day one
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            The same core library powers a CLI, a VS Code extension, and can be
            embedded in web tooling — including this site&apos;s IR view.
          </p>
        </div>
      </section>
    </div>
  );
}
