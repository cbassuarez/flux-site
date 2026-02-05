import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type InlineSlotDemoProps = {
  value: string;
};

export function InlineSlotDemo({ value }: InlineSlotDemoProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={value}
        className="inline-flex items-center rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-600"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -3 }}
        transition={{ duration: prefersReducedMotion ? 0.45 : 0.25, ease: "easeOut" }}
      >
        [{value}]
      </motion.span>
    </AnimatePresence>
  );
}
