import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SiteContainer } from "./SiteContainer";

type HeroSectionProps = {
  children: ReactNode;
};

export function HeroSection({ children }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-flux-hero" />
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        initial={shouldReduceMotion ? false : { opacity: 0.2, scale: 0.9 }}
        animate={shouldReduceMotion ? { opacity: 0.45, scale: 1 } : { opacity: 0.45, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 2, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="absolute -left-24 top-10 h-44 w-44 rounded-full bg-sky-100"
          animate={shouldReduceMotion ? undefined : { y: [0, -10, 6, 0], rotate: [0, 4, -3, 0] }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-28 bottom-8 h-56 w-56 rounded-full bg-sky-50"
          animate={shouldReduceMotion ? undefined : { y: [0, 12, -8, 0], rotate: [0, -3, 2, 0] }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 10.5, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </motion.div>

      <SiteContainer className="py-12 sm:py-16 lg:py-20">
        <motion.div
          className="w-full space-y-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {children}
        </motion.div>
      </SiteContainer>
    </section>
  );
}
