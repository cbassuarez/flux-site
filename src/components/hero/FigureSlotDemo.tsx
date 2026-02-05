import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { seededIndex } from "./determinism";

type FigureSlotDemoProps = {
  seed: number;
  docstep: number;
};

const FIGURES = [
  {
    id: "grid",
    render: () => (
      <svg viewBox="0 0 200 140" className="h-full w-full">
        <rect
          x="16"
          y="14"
          width="168"
          height="112"
          rx="12"
          fill="#F8FAFC"
          stroke="#CBD5F5"
          strokeWidth="1.4"
        />
        <path
          d="M16 52H184M16 88H184M64 14V126M104 14V126M144 14V126"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
        <circle cx="64" cy="52" r="6" fill="#38BDF8" />
        <circle cx="104" cy="88" r="6" fill="#22C55E" />
        <circle cx="144" cy="52" r="6" fill="#0EA5E9" />
      </svg>
    ),
  },
  {
    id: "flow",
    render: () => (
      <svg viewBox="0 0 200 140" className="h-full w-full" fill="none">
        <path
          d="M22 102C52 40 148 40 178 102"
          stroke="#38BDF8"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M22 102C52 120 148 120 178 102"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
        <circle cx="22" cy="102" r="6" fill="#0EA5E9" />
        <circle cx="100" cy="54" r="7" fill="#22C55E" />
        <circle cx="178" cy="102" r="6" fill="#38BDF8" />
      </svg>
    ),
  },
  {
    id: "bars",
    render: () => (
      <svg viewBox="0 0 200 140" className="h-full w-full">
        <rect x="18" y="20" width="164" height="100" rx="10" fill="#F8FAFC" />
        <rect x="40" y="68" width="18" height="40" rx="4" fill="#38BDF8" />
        <rect x="70" y="52" width="18" height="56" rx="4" fill="#0EA5E9" />
        <rect x="100" y="36" width="18" height="72" rx="4" fill="#22C55E" />
        <rect x="130" y="58" width="18" height="50" rx="4" fill="#7DD3FC" />
        <path d="M32 108H168" stroke="#E2E8F0" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "wave",
    render: () => (
      <svg viewBox="0 0 200 140" className="h-full w-full" fill="none">
        <path
          d="M10 74C30 54 50 94 70 74C90 54 110 94 130 74C150 54 170 94 190 74"
          stroke="#0EA5E9"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M10 92C30 72 50 112 70 92C90 72 110 112 130 92C150 72 170 112 190 92"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="5 6"
        />
        <circle cx="70" cy="74" r="5" fill="#22C55E" />
        <circle cx="130" cy="74" r="5" fill="#38BDF8" />
      </svg>
    ),
  },
];

export function FigureSlotDemo({ seed, docstep }: FigureSlotDemoProps) {
  const prefersReducedMotion = useReducedMotion();
  const index = seededIndex(seed, docstep, FIGURES.length, 43);
  const figure = FIGURES[index] ?? FIGURES[0];

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="relative aspect-[4/3]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={figure.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.5 : 0.35, ease: "easeOut" }}
          >
            {figure.render()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
