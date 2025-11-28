import { useEffect, useRef, useState } from "react";
import { initRuntimeState, parseDocument, runDocstepOnce } from "@flux-lang/core";

import type { FluxDocument, Material } from "@flux-lang/core";

const DEFAULT_SOURCE = `document {
  meta {
    title   = "Editor Test Patch";
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
    docstepAdvance = [ timer(8s) ];
    eventsApply = "deferred";
  }
}`;

type RuntimeSnapshot = {
  docstep: number;
  params: Record<string, any>;
  grids: Record<
    string,
    {
      name: string;
      rows: number;
      cols: number;
      cells: { id: string; tags: string[]; content: string; dynamic?: number }[];
    }
  >;
};

type Runtime = {
  snapshot: () => RuntimeSnapshot;
  stepDoc: () => void;
  reset: () => void;
  updateParam?: (name: string, value: number | boolean | string) => void;
};

function createRuntime(doc: FluxDocument, _options?: { clock?: string }): Runtime {
  let state = initRuntimeState(doc);

  function toSnapshot(): RuntimeSnapshot {
    return {
      docstep: (state as any).docstepIndex ?? 0,
      params: { ...(state as any).params },
      grids: (state as any).grids,
    };
  }

  return {
    snapshot: () => toSnapshot(),
    stepDoc() {
      state = runDocstepOnce(doc, state);
    },
    reset() {
      state = initRuntimeState(doc);
    },
    updateParam(name: string, value: number | boolean | string) {
      state = {
        ...(state as any),
        params: {
          ...(state as any).params,
          [name]: value,
        },
      } as any;
    },
  };
}

function computeGridLayout(doc: FluxDocument, snapshot: RuntimeSnapshot) {
  return {
    docstep: snapshot.docstep ?? 0,
    grids: doc.grids.map((grid) => {
      const gridState = snapshot.grids?.[grid.name];
      const rows = gridState?.rows ?? grid.size?.rows ?? 0;
      const cols = gridState?.cols ?? grid.size?.cols ?? 0;
      const cells = gridState?.cells ?? [];

      return {
        name: grid.name,
        rows,
        cols,
        cells: cells.map((cell, idx) => ({
          ...cell,
          id: cell.id ?? `${grid.name}-${idx}`,
          tags: cell.tags ?? [],
          content: cell.content ?? "",
        })),
      };
    }),
  };
}

function getDocstepIntervalHint(_doc: FluxDocument, snapshot: RuntimeSnapshot) {
  const tempo = snapshot.params?.tempo;
  if (typeof tempo === "number" && tempo > 0) {
    return { ms: 60000 / tempo };
  }
  return { ms: 1000 };
}

export default function EditorPage() {
  const [source, setSource] = useState<string>(DEFAULT_SOURCE);

  const [doc, setDoc] = useState<FluxDocument | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);

  const [parseError, setParseError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>("Ready");

  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [cellBindings, setCellBindings] = useState<Record<string, string | null>>({});

  const [leftTab, setLeftTab] = useState<"structure" | "materials">("structure");

  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (playTimerRef.current != null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, []);

  function stopTimer() {
    if (playTimerRef.current != null) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
  }

  function syncParamValuesFromDoc(parsed: FluxDocument, snap?: RuntimeSnapshot | null) {
    const next: Record<string, any> = {};
    const existing = paramValues;

    for (const param of parsed.state?.params ?? []) {
      if (snap && (snap as any).params && param.name in (snap as any).params) {
        next[param.name] = (snap as any).params[param.name];
      } else if (existing && existing[param.name] !== undefined) {
        next[param.name] = existing[param.name];
      } else {
        next[param.name] = param.initial;
      }
    }

    setParamValues(next);
  }

  function handleApply() {
    stopTimer();

    try {
      const parsed = parseDocument(source);
      const rt = createRuntime(parsed, { clock: "manual" });

      if (typeof (rt as any).updateParam === "function") {
        for (const [name, value] of Object.entries(paramValues)) {
          (rt as any).updateParam(name, value);
        }
      }

      const snap = rt.snapshot();

      setDoc(parsed);
      setRuntime(rt);
      setSnapshot(snap);
      setParseError(null);
      syncParamValuesFromDoc(parsed, snap);
      setStatusMessage(`Parsed OK · docstep ${(snap as any).docstep ?? 0}`);

      setMaterials(parsed.materials?.materials ?? []);
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      setParseError(msg);
      setStatusMessage("Parse error");
      setDoc(null);
      setRuntime(null);
      setSnapshot(null);
    }
  }

  function handlePlay() {
    if (!runtime || !doc) return;

    stopTimer();

    let snap = runtime.snapshot();
    setSnapshot(snap);

    const hint = getDocstepIntervalHint(doc, snap);
    const intervalMs = (hint as any)?.ms ?? 1000;

    setIsPlaying(true);
    setStatusMessage(`Running · docstep ${(snap as any).docstep ?? 0}`);

    playTimerRef.current = window.setInterval(() => {
      try {
        runtime.stepDoc();
        snap = runtime.snapshot();
        setSnapshot(snap);
        setStatusMessage(`Running · docstep ${(snap as any).docstep ?? 0}`);
      } catch (err) {
        stopTimer();
        const msg = (err as Error)?.message ?? String(err);
        setParseError(msg);
        setStatusMessage("Runtime error");
      }
    }, intervalMs);
  }

  function handlePause() {
    if (!runtime) return;
    stopTimer();
    const snap = runtime.snapshot();
    setSnapshot(snap);
    setStatusMessage(`Paused · docstep ${(snap as any).docstep ?? 0}`);
  }

  function handleStep() {
    if (!runtime) return;
    stopTimer();
    try {
      runtime.stepDoc();
      const snap = runtime.snapshot();
      setSnapshot(snap);
      setStatusMessage(`Stepped · docstep ${(snap as any).docstep ?? 0}`);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      setParseError(msg);
      setStatusMessage("Runtime error");
    }
  }

  function handleReset() {
    if (!runtime) return;
    stopTimer();
    try {
      runtime.reset();
      const snap = runtime.snapshot();
      setSnapshot(snap);
      if (doc) {
        syncParamValuesFromDoc(doc, snap);
      }
      setStatusMessage("Reset · docstep 0");
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      setParseError(msg);
      setStatusMessage("Runtime error");
    }
  }

  function handleParamChange(name: string, value: number | boolean | string) {
    setParamValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (runtime && typeof (runtime as any).updateParam === "function") {
      try {
        (runtime as any).updateParam(name, value);
        const snap = runtime.snapshot();
        setSnapshot(snap);
        setStatusMessage(
          `Param ${name} = ${String(value)} · docstep ${(snap as any).docstep ?? 0}`,
        );
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        setParseError(msg);
        setStatusMessage("Runtime error");
      }
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] border-t border-slate-200 bg-slate-50">
      <EditorTopBar
        title={doc?.meta.title ?? "Untitled Flux document"}
        status={statusMessage}
        onApply={handleApply}
        onPlay={handlePlay}
        onPause={handlePause}
        onStep={handleStep}
        onReset={handleReset}
        isPlaying={isPlaying}
        hasRuntime={!!runtime}
      />

      <div className="flex flex-1 min-h-0">
        <EditorSidebarLeft
          doc={doc}
          activeTab={leftTab}
          onTabChange={setLeftTab}
          materials={materials}
          onMaterialsChange={(next) => {
            setMaterials(next);
            setCellBindings((prev) => {
              const validNames = new Set(next.map((m) => m.name));
              const nextBindings: Record<string, string | null> = {};
              for (const [cellId, matName] of Object.entries(prev)) {
                nextBindings[cellId] = matName && validNames.has(matName) ? matName : null;
              }
              return nextBindings;
            });
          }}
          selectedCellId={selectedCellId}
          cellBindings={cellBindings}
          onCellBindingChange={(cellId, materialName) => {
            setCellBindings((prev) => ({
              ...prev,
              [cellId]: materialName,
            }));
          }}
        />
        <EditorCanvas
          doc={doc}
          snapshot={snapshot}
          source={source}
          onSourceChange={setSource}
          materials={materials}
          cellBindings={cellBindings}
          selectedCellId={selectedCellId}
          onSelectCell={(cellId) => setSelectedCellId(cellId)}
        />
        <EditorSidebarRight doc={doc} paramValues={paramValues} onParamChange={handleParamChange} />
      </div>

      <EditorConsole parseError={parseError} />
    </div>
  );
}

function EditorTopBar(props: {
  title: string;
  status: string | null;
  onApply: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  isPlaying: boolean;
  hasRuntime: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500">flux editor</span>
        <span className="truncate text-slate-900">{props.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
          <button
            type="button"
            onClick={props.onPlay}
            disabled={!props.hasRuntime}
            className="px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            ▶︎
          </button>
          <button
            type="button"
            onClick={props.onPause}
            disabled={!props.hasRuntime}
            className="px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            ❚❚
          </button>
          <button
            type="button"
            onClick={props.onStep}
            disabled={!props.hasRuntime}
            className="px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            Step
          </button>
          <button
            type="button"
            onClick={props.onReset}
            disabled={!props.hasRuntime}
            className="px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        {props.status && <span className="hidden text-[11px] text-slate-500 sm:inline">{props.status}</span>}

        <button
          type="button"
          onClick={props.onApply}
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function EditorSidebarLeft(props: {
  doc: FluxDocument | null;
  activeTab: "structure" | "materials";
  onTabChange: (tab: "structure" | "materials") => void;
  materials: Material[];
  onMaterialsChange: (next: Material[]) => void;
  selectedCellId: string | null;
  cellBindings: Record<string, string | null>;
  onCellBindingChange: (cellId: string, materialName: string | null) => void;
}) {
  return (
    <aside className="flex w-64 min-w-[14rem] max-w-xs flex-col border-r border-slate-200 bg-white/70 backdrop-blur-sm">
      <div className="border-b border-slate-200 px-3 py-2">
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => props.onTabChange("structure")}
            className={
              "rounded-full px-2 py-0.5 " +
              (props.activeTab === "structure"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800")
            }
          >
            Structure
          </button>
          <button
            type="button"
            onClick={() => props.onTabChange("materials")}
            className={
              "rounded-full px-2 py-0.5 " +
              (props.activeTab === "materials"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800")
            }
          >
            Materials
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-3 py-3">
        {props.activeTab === "structure" && (
          <>
            {!props.doc && <p className="text-xs text-slate-500">Apply a document to see grids and materials.</p>}

            {props.doc && (
              <>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Grids</div>
                  <ul className="space-y-1 text-xs">
                    {props.doc.grids.map((grid) => (
                      <li
                        key={grid.name}
                        className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1"
                      >
                        <span className="font-mono text-[11px]">{grid.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {grid.size?.rows ?? "?"}×{grid.size?.cols ?? "?"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {props.doc.materials?.materials?.length ? (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Materials</div>
                    <ul className="space-y-1 text-xs">
                      {props.doc.materials.materials.map((m) => (
                        <li key={m.name} className="flex flex-col rounded border border-slate-200 bg-slate-50 px-2 py-1">
                          <span className="font-mono text-[11px]">{m.name}</span>
                          {m.label && <span className="text-[11px] text-slate-500">{m.label}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {props.activeTab === "materials" && (
          <>
            {props.selectedCellId && (
              <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-[11px]">
                <div className="mb-1 text-slate-500">
                  Selected cell <span className="font-mono text-slate-800">{props.selectedCellId}</span>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Material</span>
                  <select
                    value={props.cellBindings[props.selectedCellId] ?? ""}
                    onChange={(e) => props.onCellBindingChange(props.selectedCellId!, e.target.value || null)}
                    className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                  >
                    <option value="">(none)</option>
                    {props.materials.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.label ?? m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const idx = props.materials.length + 1;
                const name = `mat${idx}`;
                const next: Material[] = [...props.materials, { name, tags: [], label: `Material ${idx}` }];
                props.onMaterialsChange(next);
              }}
              className="mb-2 inline-flex items-center justify-center rounded border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add material
            </button>

            {props.materials.length === 0 && (
              <p className="text-xs text-slate-500">No materials yet. Add one to start annotating the score.</p>
            )}

            <ul className="space-y-1 text-xs">
              {props.materials.map((mat, idx) => (
                <li key={mat.name + idx} className="space-y-1 rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      value={mat.name}
                      onChange={(e) => {
                        const next = [...props.materials];
                        next[idx] = { ...mat, name: e.target.value };
                        props.onMaterialsChange(next);
                      }}
                      className="w-24 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = props.materials.filter((_, i) => i !== idx);
                        props.onMaterialsChange(next);
                      }}
                      className="text-[11px] text-slate-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    placeholder="Label"
                    value={mat.label ?? ""}
                    onChange={(e) => {
                      const next = [...props.materials];
                      next[idx] = { ...mat, label: e.target.value };
                      props.onMaterialsChange(next);
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px] text-slate-800"
                  />

                  <input
                    placeholder="tags: comma,separated"
                    value={mat.tags.join(", ")}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean);
                      const next = [...props.materials];
                      next[idx] = { ...mat, tags };
                      props.onMaterialsChange(next);
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] text-slate-600"
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}

function EditorSidebarRight(props: {
  doc: FluxDocument | null;
  paramValues: Record<string, any>;
  onParamChange: (name: string, value: number | boolean | string) => void;
}) {
  return (
    <aside className="flex w-64 min-w-[14rem] max-w-xs flex-col border-l border-slate-200 bg-white/70 backdrop-blur-sm">
      <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Params
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 py-3">
        {!props.doc && <p className="text-xs text-slate-500">Apply a document to see parameters.</p>}

        {props.doc && props.doc.state?.params?.length ? (
          <ul className="space-y-1 text-xs">
            {props.doc.state.params.map((p) => {
              const current = props.paramValues[p.name] ?? p.initial;
              const isNumeric = p.type === "int" || p.type === "float";
              const hasRange = typeof p.min === "number" && typeof p.max === "number";

              return (
                <li key={p.name} className="flex flex-col rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <div className="flex justify-between">
                    <span className="font-mono text-[11px]">{p.name}</span>
                    <span className="text-[11px] text-slate-500">{p.type}</span>
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    min={p.min ?? "–"} · max={p.max ?? "–"} · initial={String(p.initial)}
                  </div>

                  {isNumeric && hasRange && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={Number(p.min)}
                        max={Number(p.max)}
                        step={p.type === "int" ? 1 : 0.01}
                        value={Number(current)}
                        onChange={(e) => props.onParamChange(p.name, Number(e.target.value))}
                        className="h-1 w-full cursor-pointer accent-slate-900"
                      />
                      <input
                        type="number"
                        min={Number(p.min)}
                        max={Number(p.max)}
                        step={p.type === "int" ? 1 : 0.01}
                        value={Number(current)}
                        onChange={(e) => props.onParamChange(p.name, Number(e.target.value))}
                        className="w-16 rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] font-mono text-slate-800"
                      />
                    </div>
                  )}

                  {!isNumeric && (
                    <input
                      type="text"
                      value={String(current)}
                      onChange={(e) => props.onParamChange(p.name, e.target.value)}
                      className="mt-2 w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-800"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

function EditorSourcePane(props: { source: string; onChange: (value: string) => void }) {
  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Source
      </div>
      <textarea
        value={props.source}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-48 w-full resize-none border-0 bg-transparent p-3 font-mono text-[11px] leading-relaxed text-slate-800 focus:outline-none focus:ring-0"
        spellCheck={false}
      />
    </div>
  );
}

function EditorCanvas(props: {
  doc: FluxDocument | null;
  snapshot: RuntimeSnapshot | null;
  source: string;
  onSourceChange: (value: string) => void;
  materials: Material[];
  cellBindings: Record<string, string | null>;
  selectedCellId: string | null;
  onSelectCell?: (cellId: string) => void;
}) {
  const layout = props.doc && props.snapshot
    ? (() => {
        try {
          return computeGridLayout(props.doc!, props.snapshot!);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <main className="flex-1 min-w-0 bg-slate-100 px-4 py-3">
      <div className="flex h-full flex-col gap-3">
        <EditorSourcePane source={props.source} onChange={props.onSourceChange} />

        {!layout && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60">
            <p className="text-xs text-slate-500">Apply a valid Flux document to see the grid layout.</p>
          </div>
        )}

        {layout && (
          <div className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-slate-600">
                docstep <span className="font-mono font-semibold">{layout.docstep}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 space-y-6 overflow-auto">
              {layout.grids.map((grid) => (
                <section key={grid.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">grid {grid.name}</h2>
                    <span className="text-[11px] text-slate-400">
                      {grid.rows} × {grid.cols}
                    </span>
                  </div>

                  <div
                    className="grid gap-px rounded-lg border border-slate-200 bg-slate-200 p-1"
                    style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
                  >
                    {grid.cells.map((cell) => {
                      const bindingName = props.cellBindings[cell.id] ?? null;
                      const boundMaterial = (bindingName && props.materials.find((m) => m.name === bindingName)) || null;

                      const baseLabel = (cell.content && cell.content.length > 0 ? cell.content : cell.tags[0]) ?? "";

                      const labelLines = [
                        baseLabel || "·",
                        boundMaterial ? boundMaterial.label ?? boundMaterial.name : null,
                      ].filter(Boolean) as string[];

                      return (
                        <div
                          key={cell.id}
                          onClick={() => props.onSelectCell?.(cell.id)}
                          className={[
                            "flex aspect-square flex-col items-center justify-center rounded bg-white text-[11px] text-slate-700 cursor-pointer",
                            cell.id === props.selectedCellId ? "ring-2 ring-slate-900" : "",
                          ].join(" ")}
                        >
                          {labelLines.map((line, idx) => (
                            <span
                              key={idx}
                              className={
                                idx === 0 ? "truncate px-1" : "truncate px-1 text-[9px] text-slate-400"
                              }
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function EditorConsole(props: { parseError: string | null }) {
  return (
    <div className="border-t border-slate-200 bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
      {props.parseError ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-red-200">{props.parseError}</pre>
      ) : (
        <span className="text-slate-400">
          Ready. Press <span className="font-mono">Apply</span> to parse the source.
        </span>
      )}
    </div>
  );
}
