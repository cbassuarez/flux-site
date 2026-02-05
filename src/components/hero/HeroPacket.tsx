import { motion } from "framer-motion";
import { CliInstallWidget } from "../CliInstallWidget";
import { FluxBadge } from "../FluxBadge";
import { HeroSection } from "../HeroSection";
import { PageStack } from "./PageStack";

export function HeroPacket() {
  return (
    <HeroSection>
      <div className="flex w-full flex-col gap-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-6">
            <FluxBadge className="hero-brand-pill" />

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Live packet
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Deterministic, PDF-like documents that evolve docstep by docstep.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Flux keeps layout locked while inline and figure slots update in a
                predictable sequence. The packet below simulates a live viewer
                with steady, no-reflow pagination.
              </p>
            </div>

            <motion.div
              className="flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
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
          </div>

          <PageStack />
        </div>

        <CliInstallWidget />
      </div>
    </HeroSection>
  );
}
