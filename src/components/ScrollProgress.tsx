import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const opacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);

  return (
    <div className="pointer-events-none fixed right-0 top-0 z-40 h-full w-[3px]">
      <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--fg)_10%,transparent)]" />
      <motion.div
        className="absolute inset-0 origin-top"
        style={{
          scaleY: shouldReduceMotion ? 1 : scrollYProgress,
          opacity: shouldReduceMotion ? 0.8 : opacity,
          background: "var(--flux-accent-gradient)",
        }}
      />
    </div>
  );
}
