import { motion, useReducedMotion } from "framer-motion";

const hoverShadow = "0 30px 90px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.08)";
const baseShadow = "0 24px 70px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.06)";

export function HeroMediaCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="group relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
      style={{ boxShadow: baseShadow }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -8,
              boxShadow: hoverShadow,
            }
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      <img
        src="/hero-terminal.svg"
        alt="Flux CLI preview"
        className="relative w-full rounded-2xl border border-white/10 bg-slate-950/70"
      />
      <div
        className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-700 motion-safe:group-hover:translate-x-[200%] motion-safe:group-hover:opacity-80"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/5" />
    </motion.div>
  );
}
