import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { seededIndex } from "./determinism";

type InlineSlotDemoProps = {
  seed: number;
  docstep: number;
};

const WORDS = ["adaptive", "deterministic", "bounded", "traceable", "composed"];

export function InlineSlotDemo({ seed, docstep }: InlineSlotDemoProps) {
  const prefersReducedMotion = useReducedMotion();
  const index = seededIndex(seed, docstep, WORDS.length, 17);
  const word = WORDS[index] ?? WORDS[0];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={word}
        className="inline-flex items-center rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-600"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -3 }}
        transition={{ duration: prefersReducedMotion ? 0.45 : 0.25, ease: "easeOut" }}
      >
        [{word}]
      </motion.span>
    </AnimatePresence>
  );
}
