import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { parseDocument } from "@flux-lang/core";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { seededFloat, seededIndex } from "./determinism";
import { FigureSlotDemo } from "./FigureSlotDemo";
import { InlineSlotDemo } from "./InlineSlotDemo";
import { Page } from "./Page";

const FLUX_SOURCE = `document {
  meta {
    title   = "Flux";
    version = "0.1.0";
  }

  state {
    param tempo : float [40, 160] @ 96;
    param spawnProb : float [0.0, 1.0] @ 0.3;
  }

  grid main {
    topology = grid;
    size { rows = 2; cols = 4; }

    cell c1 { tags = [ seed, pulse ]; content = "seed"; dynamic = 0.9; }
    cell c2 { tags = [ pulse ]; content = ""; dynamic = 0.0; }
    cell c3 { tags = [ pulse ]; content = ""; dynamic = 0.0; }
    cell c4 { tags = [ pulse ]; content = ""; dynamic = 0.0; }
    cell c5 { tags = [ noise ]; content = ""; dynamic = 0.0; }
    cell c6 { tags = [ noise ]; content = ""; dynamic = 0.0; }
    cell c7 { tags = [ noise ]; content = ""; dynamic = 0.0; }
    cell c8 { tags = [ noise ]; content = ""; dynamic = 0.0; }
  }

  runtime {
    docstepAdvance = [ timer(1.2s) ];
    eventsApply = "deferred";
  }

  rule growNoise(mode = docstep, grid = main) {
    when cell.content == "" and neighbors.all().dynamic > 0.5
    then {
      cell.content = "noise";
    }
  }
}
`;

const RULE_SNIPPET = `rule growNoise(mode = docstep, grid = main) {
  when cell.content == "" and neighbors.all().dynamic > 0.5
  then {
    cell.content = "noise";
  }
}`;

const SEED = 1;
const INITIAL_DOCSTEP = 42;
const DEFAULT_INTERVAL = 1200;
const REDUCED_INTERVAL = 2000;

function formatDocstepAdvance(entry: any) {
  if (!entry) return "";
  if (entry.kind === "timer") {
    return `timer(${entry.amount}${entry.unit})`;
  }
  if (entry.kind === "transport") {
    return `transport(${entry.eventName})`;
  }
  if (entry.kind === "ruleRequest") {
    return `ruleRequest(${entry.name})`;
  }
  return "";
}

export function PageStack() {
  const prefersReducedMotion = useReducedMotion();
  const intervalMs = prefersReducedMotion ? REDUCED_INTERVAL : DEFAULT_INTERVAL;
  const [docstep, setDocstep] = useState(INITIAL_DOCSTEP);
  const [activeIndex, setActiveIndex] = useState(0);

  const doc = useMemo(() => {
    try {
      return parseDocument(FLUX_SOURCE);
    } catch {
      return null;
    }
  }, []);

  const params = doc?.state?.params ?? [];
  const grid = doc?.grids?.[0];
  const gridRows = grid?.size?.rows ?? 2;
  const gridCols = grid?.size?.cols ?? 4;
  const gridName = grid?.name ?? "main";
  const gridCells = grid?.cells ?? [];

  const runtimeAdvance = doc?.runtime?.docstepAdvance?.map(formatDocstepAdvance).filter(Boolean).join(", ") ?? "timer(1.2s)";
  const runtimeEvents = doc?.runtime?.eventsApply ?? "deferred";

  const paramSnapshots = useMemo(() => {
    return params.map((param, index) => {
      const hasRange = typeof param.min === "number" && typeof param.max === "number";
      const min = hasRange ? Number(param.min) : 0;
      const max = hasRange ? Number(param.max) : 1;
      const rawValue = seededFloat(SEED, docstep, min, max, 37 + index * 11);
      const value =
        param.type === "int"
          ? Math.round(rawValue)
          : Math.round(rawValue * 10) / 10;
      const formattedValue =
        param.type === "int" ? String(value) : value.toFixed(1);
      const range = hasRange ? ` [${param.min}, ${param.max}]` : "";

      return {
        name: param.name,
        type: param.type,
        initial: param.initial,
        range,
        value: formattedValue,
      };
    });
  }, [docstep, params]);

  const safeGridRows = Math.max(1, gridRows);
  const safeGridCols = Math.max(1, gridCols);
  const totalCells = Math.max(gridCells.length, safeGridRows * safeGridCols);
  const activeCellIndex = seededIndex(SEED, docstep, totalCells, 101);
  const activeCell = gridCells[activeCellIndex];
  const activeCellRow = Math.floor(activeCellIndex / safeGridCols);
  const activeCellCol = activeCellIndex % safeGridCols;
  const activeCellName = activeCell?.name ?? `c${activeCellIndex + 1}`;
  const activeCellTags = activeCell?.tags ?? [];
  const activeCellContentOptions = Array.from(
    new Set(
      [activeCell?.content, ...activeCellTags, "noise", "pulse"].filter(Boolean),
    ),
  ) as string[];
  const activeCellContent =
    activeCellContentOptions[
      seededIndex(SEED, docstep, activeCellContentOptions.length, 203)
    ] ?? "noise";

  const metaTitle = doc?.meta?.title ?? "Flux";
  const metaVersion = doc?.meta?.version ?? "0.1.0";

  const pages = [
    {
      id: "cover",
      label: "Meta",
      content: (
        <div className="flex h-full flex-col justify-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Flux document
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            {metaTitle}
          </h2>
          <p className="text-xs text-slate-500">Version {metaVersion}</p>
          <div className="mt-3 grid gap-2 text-[11px] text-slate-500">
            <div>grid {gridName} · {safeGridRows}×{safeGridCols}</div>
            <div>params {params.length}</div>
            <div>runtime {runtimeAdvance}</div>
          </div>
          {paramSnapshots[0] ? (
            <div className="mt-2 text-[11px] text-slate-500">
              snapshot {paramSnapshots[0].name} = {" "}
              <InlineSlotDemo value={paramSnapshots[0].value} />
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "state",
      label: "State",
      content: (
        <div className="space-y-4">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Params
          </h3>
          <div className="space-y-2">
            {paramSnapshots.map((param) => (
              <div
                key={param.name}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-[10px] text-slate-500">
                  <div className="font-mono text-[11px] text-slate-700">
                    param {param.name} : {param.type}{param.range}
                  </div>
                  <div>initial {String(param.initial)}</div>
                </div>
                <InlineSlotDemo value={param.value} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Parameter snapshots update deterministically on each docstep.
          </p>
        </div>
      ),
    },
    {
      id: "grid",
      label: "Grid",
      content: (
        <div className="space-y-4">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Grid {gridName}
          </h3>
          <FigureSlotDemo
            rows={safeGridRows}
            cols={safeGridCols}
            activeCell={{ row: activeCellRow, col: activeCellCol }}
          />
          <p className="text-[11px] text-slate-500">
            active cell {activeCellName} · content {" "}
            <InlineSlotDemo value={activeCellContent} />
          </p>
        </div>
      ),
    },
    {
      id: "runtime",
      label: "Runtime",
      content: (
        <div className="space-y-4">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Runtime + Rules
          </h3>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-600">
            <div>runtime {"{"}</div>
            <div className="pl-3">docstepAdvance = [ {runtimeAdvance} ];</div>
            <div className="pl-3">eventsApply = "{runtimeEvents}";</div>
            <div>{"}"}</div>
          </div>
          <pre className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] text-slate-600">
{RULE_SNIPPET}
          </pre>
          <p className="text-[11px] text-slate-500">
            rule output → cell.content {" "}
            <InlineSlotDemo value={activeCellContent} />
          </p>
        </div>
      ),
    },
  ];

  const totalPages = pages.length;

  const advanceDocstep = useCallback(() => {
    setDocstep((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      advanceDocstep();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [advanceDocstep, intervalMs]);

  const advancePage = useCallback(
    (direction: number) => {
      setActiveIndex((prev) => (prev + direction + totalPages) % totalPages);
    },
    [totalPages],
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

  const renderPage = (pageIndex: number) => (
    <Page
      pageNumber={pageIndex + 1}
      totalPages={totalPages}
      label={pages[pageIndex]?.label}
    >
      {pages[pageIndex]?.content}
    </Page>
  );

  return (
    <div className="relative mx-auto w-full max-w-sm sm:max-w-md">
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
                renderPage(pageIndex)
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
                  {renderPage(pageIndex)}
                </motion.div>
              )}
            </div>
          );
        })}

        {prefersReducedMotion ? (
          <div key={pages[topIndex]?.id} className="absolute inset-0 z-20">
            {renderPage(topIndex)}
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
              {renderPage(topIndex)}
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
