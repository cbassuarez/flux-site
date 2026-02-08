import { motion, useReducedMotion } from "framer-motion";

const hoverShadow = "0 30px 90px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(148, 163, 184, 0.25)";
const baseShadow = "0 24px 70px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(148, 163, 184, 0.18)";

export function HeroMediaCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="group relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
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
      <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_10%,transparent)] via-transparent to-transparent" />
      <img
        src="/hero-terminal.png"
        alt="Flux CLI preview"
        className="relative w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-3)]"
      />
      <div
        className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--fg)_20%,transparent)] to-transparent opacity-0 transition duration-700 motion-safe:group-hover:translate-x-[200%] motion-safe:group-hover:opacity-80"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[var(--border)] opacity-60" />
    </motion.div>
  );
}
