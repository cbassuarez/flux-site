import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const opacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-40 h-[3px] w-full">
      <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--fg)_10%,transparent)]" />
      <motion.div
        className="absolute inset-0 origin-left"
        style={{
          scaleX: shouldReduceMotion ? 1 : scrollYProgress,
          opacity: shouldReduceMotion ? 0.8 : opacity,
          background: "linear-gradient(96deg, var(--accent) 0%, var(--accent-2) 100%)",
        }}
      />
    </div>
  );
}
