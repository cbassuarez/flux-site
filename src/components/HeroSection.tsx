import { motion } from "framer-motion";
import type { ReactNode } from "react";

type HeroSectionProps = {
  children: ReactNode;
};

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-flux-hero" />

      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20 lg:py-24">
        <motion.div
          className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
