import { motion, useReducedMotion } from "framer-motion";
import { CliInstallWidget } from "../CliInstallWidget";
import { HeroSection } from "../HeroSection";
import { HeroMediaCard } from "./HeroMediaCard";
import { FluxLens } from "../ui/FluxLens";

export function HeroPacket() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <HeroSection>
      <div className="flex w-full flex-col gap-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Live packet
            </div>
            <h1 className="text-3xl font-light leading-[1.05] tracking-[-0.02em] text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)] sm:text-4xl lg:text-5xl">
              <FluxLens preset="hero" as="span" className="inline-block">
                Deterministic, PDF-like documents that evolve docstep by docstep.
              </FluxLens>
            </h1>
            <p className="text-sm leading-relaxed text-slate-600/80 sm:text-base">
              Flux keeps layout locked while inline parameters and grid slots update
              deterministically. The packet below is a typeset view of a real
              Flux document — click to turn pages.
            </p>
          </div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-3"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.a
              href="/docs"
              className="inline-flex items-center rounded-full flux-gradient-bg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              whileHover={
                shouldReduceMotion ? undefined : { scale: 1.02, boxShadow: "0 10px 30px rgba(0,205,254,0.35)" }
              }
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            >
              Get started
            </motion.a>
            <motion.a
              href="/docs"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02, translateY: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            >
              Docs
            </motion.a>
            <motion.a
              href="https://github.com/cbassuarez/flux"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02, translateY: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            >
              GitHub
            </motion.a>
          </motion.div>
        </div>

        <HeroMediaCard />

        <CliInstallWidget />
      </div>
    </HeroSection>
  );
}
