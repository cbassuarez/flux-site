import { motion, useReducedMotion } from "framer-motion";

type FigureSlotDemoProps = {
  rows: number;
  cols: number;
  activeCell?: { row: number; col: number } | null;
};

export function FigureSlotDemo({ rows, cols, activeCell }: FigureSlotDemoProps) {
  const prefersReducedMotion = useReducedMotion();
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const marginX = 18;
  const marginY = 16;
  const gap = 6;
  const viewWidth = 200;
  const viewHeight = 140;
  const cellWidth = (viewWidth - marginX * 2 - gap * (safeCols - 1)) / safeCols;
  const cellHeight = (viewHeight - marginY * 2 - gap * (safeRows - 1)) / safeRows;

  const highlightRow = activeCell?.row ?? 0;
  const highlightCol = activeCell?.col ?? 0;
  const highlightX = marginX + highlightCol * (cellWidth + gap);
  const highlightY = marginY + highlightRow * (cellHeight + gap);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="relative aspect-[4/3]">
        <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-full w-full">
          <rect
            x={marginX - 6}
            y={marginY - 6}
            width={viewWidth - marginX * 2 + 12}
            height={viewHeight - marginY * 2 + 12}
            rx="14"
            fill="#F8FAFC"
            stroke="#CBD5F5"
            strokeWidth="1.2"
          />

          {Array.from({ length: safeRows }).map((_, row) =>
            Array.from({ length: safeCols }).map((__, col) => {
              const x = marginX + col * (cellWidth + gap);
              const y = marginY + row * (cellHeight + gap);
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  rx="6"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
              );
            }),
          )}

          <motion.rect
            x={highlightX}
            y={highlightY}
            width={cellWidth}
            height={cellHeight}
            rx="6"
            fill="#38BDF8"
            opacity={0.28}
            animate={{ x: highlightX, y: highlightY }}
            transition={{
              duration: prefersReducedMotion ? 0.5 : 0.35,
              ease: "easeOut",
            }}
          />
          <motion.rect
            x={highlightX}
            y={highlightY}
            width={cellWidth}
            height={cellHeight}
            rx="6"
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="1.4"
            animate={{ x: highlightX, y: highlightY }}
            transition={{
              duration: prefersReducedMotion ? 0.5 : 0.35,
              ease: "easeOut",
            }}
          />
        </svg>
      </div>
    </div>
  );
}
