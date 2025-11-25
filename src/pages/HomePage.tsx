import { useMemo } from "react";
import { motion } from "framer-motion";
import { parseDocument } from "@flux-lang/core";
import { HeroSection } from "../components/HeroSection";
import { CodePanel } from "../components/CodePanel";
import { FluxBadge } from "../components/FluxBadge";
import { CliInstallWidget } from "../components/CliInstallWidget";

export default function HomePage() {
  const fluxSource = `document {
  meta {
    title   = "Landing Example";
    version = "0.1.0";
  }

  state {
    param tempo : float [40, 72] @ 60;
  }

  grid main {
    topology = grid;
    size { rows = 1; cols = 3; }

    cell c1 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.6;
    }

    cell c2 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.6;
    }

    cell c3 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.4;
    }
  }

  runtime {
    eventsApply    = "deferred";
    docstepAdvance = [ timer(8 s) ];
  }

  rule growNoise(mode = docstep, grid = main) {
    when cell.content == "" and neighbors.all().dynamic > 0.5
    then {
      cell.content = "noise";
    }
  }
}`;

  const { irJson, error } = useMemo(() => {
    try {
      const doc = parseDocument(fluxSource);
      const json = JSON.stringify(doc, null, 2);
      return { irJson: json, error: null as string | null };
    } catch (err) {
      const msg =
        (err as Error)?.message ?? "Unknown error while parsing Flux example.";
      return { irJson: "", error: msg };
    }
  }, [fluxSource]);

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.05 + i * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      },
    }),
  };

  const infoCards = [
    {
      title: "Language-first design",
      body:
        "Flux is specified in terms of a typed AST and a canonical JSON IR. The grammar is versioned, tested, and designed to be embedded inside other tools — not just a one-off DSL.",
    },
    {
      title: "A real runtime kernel",
      body:
        "The v0.1 runtime kernel supports docstep rules, a grid topology, and neighbor-aware dynamics via neighbors.all and neighbors.orth.",
    },
    {
      title: "Tooling from day one",
      body:
        "The same core library powers a CLI, a VS Code extension, and can be embedded in web tooling — including this site's IR view.",
    },
  ];

  return (
    <div className="space-y-14 lg:space-y-16">
      <HeroSection>
        <div className="flex w-full flex-col gap-10">
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            <FluxBadge className="hero-brand-pill" />

            <motion.div
              className="space-y-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                },
              }}
            >
              <motion.h1
                className="max-w-4xl text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900"
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
              >
                Flux is a score language for
                <span className="block flux-gradient-text">procedurally evolving music scores and parts.</span>
              </motion.h1>

              <motion.p
                className="max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed"
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Flux treats a musical score as a living system: grids of cells, rules, and runtime behavior that can evolve over time. The core abstraction is a well-defined JSON intermediate representation —
                <span className="font-mono text-xs sm:text-sm text-slate-800"> FluxDocument</span> — designed to be parsed, inspected, and transformed by tools.
              </motion.p>

              <motion.p
                className="max-w-3xl text-sm sm:text-base text-slate-600"
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              >
                This site introduces the Flux v0.1 IR, the language surface, and the tooling stack: a core parser/runtime, a CLI, and editor integrations.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-3 pt-1"
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              >
                <motion.a
                  href="/docs"
                  className="inline-flex items-center rounded-full flux-gradient-bg px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,205,254,0.35)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get started
                </motion.a>
                <motion.a
                  href="https://github.com/cbassuarez/flux"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800"
                  whileHover={{ scale: 1.02, translateY: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View on GitHub
                </motion.a>
              </motion.div>
            </motion.div>
          </motion.div>

          <CliInstallWidget />

          <motion.div
            className="mt-8 grid w-full gap-4 md:grid-cols-2 auto-rows-fr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <CodePanel title="Flux source" subtitle="v0.1 · document → FluxDocument">
              <pre className="overflow-x-auto text-[11px] sm:text-xs leading-relaxed font-mono text-slate-800">
                <code>{fluxSource}</code>
              </pre>
            </CodePanel>

            <CodePanel title="Flux IR" subtitle="FluxDocument · parseDocument(source)">
              <pre className="overflow-x-auto text-[11px] sm:text-xs leading-relaxed font-mono text-slate-800">
                <code>
                  {error ? `// Failed to parse example:\n// ${error}` : irJson}
                </code>
              </pre>
            </CodePanel>
          </motion.div>
        </div>
      </HeroSection>

      <section className="border-t border-slate-200 bg-white pt-12 pb-6">
        <div className="mx-auto max-w-6xl px-2 sm:px-4 md:px-0">
          <div className="grid gap-6 md:grid-cols-3">
            {infoCards.map((card, idx) => (
              <motion.article
                key={card.title}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition hover:border-sky-200 hover:bg-white/90"
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={cardVariants}
                whileHover={{ y: -6, boxShadow: "0 16px 36px rgba(15,23,42,0.08)" }}
              >
                <h2 className="mb-2 text-sm font-semibold text-slate-900">
                  {card.title}
                </h2>
                <p className="text-xs leading-relaxed text-slate-600">{card.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
