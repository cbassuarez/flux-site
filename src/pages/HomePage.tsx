import { motion } from "framer-motion";
import { HeroPacket } from "../components/hero/HeroPacket";

export default function HomePage() {
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
      <HeroPacket />

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
