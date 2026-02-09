import { motion, useReducedMotion } from "framer-motion";
import { CliInstallWidget } from "../CliInstallWidget";
import { HeroSection } from "../HeroSection";
import { HeroMediaCard } from "./HeroMediaCard";
import { ButtonAnchor, ButtonLink } from "../ui/Button";

export function HeroPacket() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <HeroSection>
      <div className="flex w-full flex-col gap-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-light leading-[1.05] tracking-[-0.02em] text-[var(--fg)] drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)] sm:text-4xl lg:text-5xl">
              Deterministic, PDF-like documents that evolve docstep by docstep.
            </h1>
            <p className="text-sm leading-relaxed text-[var(--muted)] sm:text-base">
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
            <ButtonLink to="/docs" variant="glass" size="md">
              Get started
            </ButtonLink>
            <ButtonLink to="/docs" variant="solid" size="md">
              Docs
            </ButtonLink>
            <ButtonAnchor
              href="https://github.com/cbassuarez/flux"
              variant="ghost"
              size="md"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </ButtonAnchor>
          </motion.div>
        </div>

        <HeroMediaCard />

        <CliInstallWidget />
      </div>
    </HeroSection>
  );
}
