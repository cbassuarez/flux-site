import { motion } from "framer-motion";
import type { ReactNode } from "react";

type HeroSectionProps = {
  children: ReactNode;
};

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-flux-hero" />
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0.2, scale: 0.9 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="absolute -left-24 top-10 h-44 w-44 rounded-full bg-sky-100"
          animate={{ y: [0, -10, 6, 0], rotate: [0, 4, -3, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-28 bottom-8 h-56 w-56 rounded-full bg-sky-50"
          animate={{ y: [0, 12, -8, 0], rotate: [0, -3, 2, 0] }}
          transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20 lg:py-24">
        <motion.div
          className="grid items-start gap-12"
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
