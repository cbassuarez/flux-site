import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import { FigureSlotDemo } from "./FigureSlotDemo";
import { InlineSlotDemo } from "./InlineSlotDemo";
import { Page } from "./Page";

type PageContext = {
  docstep: number;
  seed: number;
  reducedMotion: boolean;
};

type PageDefinition = {
  id: string;
  label: string;
  render: (context: PageContext) => ReactNode;
};

const SEED = 1;
const INITIAL_DOCSTEP = 42;
const INITIAL_TIME = 12.0;
const DEFAULT_INTERVAL = 1200;
const REDUCED_INTERVAL = 2000;

export function PageStack() {
  const prefersReducedMotion = useReducedMotion();
  const intervalMs = prefersReducedMotion ? REDUCED_INTERVAL : DEFAULT_INTERVAL;
  const [docstep, setDocstep] = useState(INITIAL_DOCSTEP);
  const [timeSeconds, setTimeSeconds] = useState(INITIAL_TIME);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = isHovering || isFocusWithin;

  const pages = useMemo<PageDefinition[]>(
    () => [
      {
        id: "cover",
        label: "Cover",
        render: () => (
          <div className="flex h-full flex-col justify-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Live Packet
            </span>
            <h2 className="font-sans text-3xl font-semibold tracking-tight text-slate-900">
              Flux
            </h2>
            <p className="text-sm text-slate-600">
              PDF-like paged documents that can evolve deterministically.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div>Inline slot</div>
              <div>Figure slot</div>
              <div>Locked layout</div>
              <div>No reflow</div>
            </div>
          </div>
        ),
      },
      {
        id: "prose",
        label: "Prose",
        render: ({ seed, docstep }) => (
          <div className="space-y-4">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Inline Slot
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-700">
              Flux viewer demo shows <InlineSlotDemo seed={seed} docstep={docstep} />
              {" "}text updates without reflow.
            </p>
            <p className="text-[11px] text-slate-500">
              Docsteps advance deterministically while the paragraph geometry stays fixed.
            </p>
          </div>
        ),
      },
      {
        id: "figure",
        label: "Figure",
        render: ({ seed, docstep }) => (
          <div className="space-y-4">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Figure Slot
            </h3>
            <FigureSlotDemo seed={seed} docstep={docstep} />
            <p className="text-[11px] text-slate-500">
              Figure slot (fixed geometry) · docstep {docstep}
            </p>
          </div>
        ),
      },
      {
        id: "proof",
        label: "Proof",
        render: () => (
          <div className="space-y-4">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Fit Policy
            </h3>
            <p className="text-[12px] text-slate-600">
              No-reflow constraints keep pagination deterministic across docsteps.
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="rounded bg-white px-2 py-0.5 shadow-sm">clip</span>
                <span className="rounded bg-white px-2 py-0.5 shadow-sm">ellipsis</span>
                <span className="rounded bg-white px-2 py-0.5 shadow-sm">shrink</span>
                <span className="rounded bg-white px-2 py-0.5 shadow-sm">scale-down</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Fit policy strip · footnote figure
            </p>
          </div>
        ),
      },
    ],
    [],
  );

  const totalPages = pages.length;

  const advanceDocstep = useCallback(() => {
    setDocstep((prev) => prev + 1);
    setTimeSeconds((prev) =>
      Math.round((prev + intervalMs / 1000) * 10) / 10,
    );
    if (!prefersReducedMotion) {
      setActiveIndex((prev) => (prev + 1) % totalPages);
    }
  }, [intervalMs, prefersReducedMotion, totalPages]);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const id = window.setInterval(() => {
      advanceDocstep();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [advanceDocstep, intervalMs, isPaused]);

  const advancePage = useCallback(
    (direction: number) => {
      setActiveIndex((prev) => (prev + direction + totalPages) % totalPages);
    },
    [totalPages],
  );

  const statusChip = (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm">
      <span>
        seed {SEED} · docstep {docstep} · time {timeSeconds.toFixed(1)}s ·
      </span>
      <span className="inline-flex items-center gap-1 text-slate-500">
        <span className="text-emerald-500">●</span>
        live
      </span>
    </span>
  );

  const orderedIndices = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, idx) => (activeIndex + idx) % totalPages),
    [activeIndex, totalPages],
  );
  const [topIndex, ...underIndices] = orderedIndices;

  const offsets = [
    { x: 3, y: 4, scale: 0.99, rotate: -0.2 },
    { x: 6, y: 8, scale: 0.985, rotate: -0.4 },
    { x: 9, y: 12, scale: 0.98, rotate: -0.6 },
  ];

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setIsFocusWithin(false);
    }
  };

  const renderPage = (pageIndex: number, isTop: boolean) => (
    <Page
      pageNumber={pageIndex + 1}
      totalPages={totalPages}
      label={pages[pageIndex]?.label}
      statusChip={isTop ? statusChip : undefined}
    >
      {pages[pageIndex]?.render({
        docstep,
        seed: SEED,
        reducedMotion: prefersReducedMotion,
      })}
    </Page>
  );

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-sm sm:max-w-md"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={handleBlur}
    >
      <div
        className="relative aspect-[3/4] w-full cursor-pointer select-none"
        style={{ perspective: 1200 }}
        onClick={() => advancePage(1)}
      >
        {underIndices.map((pageIndex, position) => {
          const offset = offsets[position] ?? offsets[offsets.length - 1];
          const wrapperStyle: CSSProperties = {
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg) scale(${offset.scale})`,
            zIndex: position + 1,
            opacity: 0.9 - position * 0.05,
          };

          return (
            <div
              key={pages[pageIndex]?.id}
              className="absolute inset-0"
              style={wrapperStyle}
            >
              {prefersReducedMotion ? (
                renderPage(pageIndex, false)
              ) : (
                <motion.div
                  className="h-full w-full"
                  animate={{ x: [0, 1, 0], y: [0, -1, 0] }}
                  transition={{
                    duration: 6 + position * 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {renderPage(pageIndex, false)}
                </motion.div>
              )}
            </div>
          );
        })}

        {prefersReducedMotion ? (
          <div key={pages[topIndex]?.id} className="absolute inset-0 z-20">
            {renderPage(topIndex, true)}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pages[topIndex]?.id}
              className="absolute inset-0 z-20"
              style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
              initial={{ opacity: 0, rotateY: -12, x: -8, y: 4 }}
              animate={{ opacity: 1, rotateY: 0, x: 0, y: 0 }}
              exit={{ opacity: 0, rotateY: 14, x: 14, y: 6, filter: "blur(2px)" }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {renderPage(topIndex, true)}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              advancePage(-1);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
            aria-label="Previous page"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12.5 4.5L7.5 10l5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              advancePage(1);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
            aria-label="Next page"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M7.5 4.5L12.5 10l-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
