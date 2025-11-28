import { useEffect, useMemo, useRef, useState } from "react";
import { parseDocument } from "@flux-lang/core";
import type { FluxDocument, Material } from "@flux-lang/core";
import EditorCanvas from "../editor/components/EditorCanvas";
import MaterialsPanel from "../editor/components/MaterialsPanel";
import RuntimeConsole, { buildRuntimeConsoleEntries, type RuntimeConsoleEntry } from "../editor/components/RuntimeConsole";
import { computeGridLayout, type EditorLayout } from "../editor/model/layoutAdapter";
import { createRuntime, getDocstepIntervalHint, type Runtime, type RuntimeSnapshot } from "../editor/model/runtime";
import { useFluxEditorState } from "../editor/state/useFluxEditorState";

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

export default function EditorPage() {
  const editor = useFluxEditorState(DEFAULT_SOURCE);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>("Ready");
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [layout, setLayout] = useState<EditorLayout | null>(null);
  const [runtimeEntries, setRuntimeEntries] = useState<RuntimeConsoleEntry[]>([]);

  const playTimerRef = useRef<number | null>(null);
  const lastDocstepRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (playTimerRef.current != null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editor.state.doc && editor.state.snapshot) {
      try {
        setLayout(computeGridLayout(editor.state.doc, editor.state.snapshot));
      } catch {
        setLayout(null);
      }
    } else {
      setLayout(null);
    }
  }, [editor.state.doc, editor.state.snapshot]);

  useEffect(() => {
    if (!layout) return;
    if (lastDocstepRef.current === layout.docstep) return;
    lastDocstepRef.current = layout.docstep;
    const entries = buildRuntimeConsoleEntries(layout);
    if (entries.length) {
      setRuntimeEntries((prev) => [...prev, ...entries].slice(-50));
    }
  }, [layout]);

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
      const parsed = parseDocument(editor.state.docSource);
      const rt = createRuntime(parsed, { clock: "manual" });

      if (typeof (rt as any).updateParam === "function") {
        for (const [name, value] of Object.entries(paramValues)) {
          (rt as any).updateParam(name, value);
        }
      }

      const snap = rt.snapshot();

      editor.setDocument(parsed, snap);
      setRuntime(rt);
      setParseError(null);
      syncParamValuesFromDoc(parsed, snap);
      setStatusMessage(`Parsed OK · docstep ${(snap as any).docstep ?? 0}`);
      setRuntimeEntries([]);
      lastDocstepRef.current = null;
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      setParseError(msg);
      setStatusMessage("Parse error");
      editor.setDocument(null, null);
      setRuntime(null);
      setLayout(null);
    }
  }

  function handlePlay() {
    if (!runtime || !editor.state.doc) return;

    stopTimer();

    let snap = runtime.snapshot();
    editor.setSnapshot(snap);

    const hint = getDocstepIntervalHint(editor.state.doc, snap);
    const intervalMs = (hint as any)?.ms ?? 1000;

    setIsPlaying(true);
    setStatusMessage(`Running · docstep ${(snap as any).docstep ?? 0}`);

    playTimerRef.current = window.setInterval(() => {
      try {
        runtime.stepDoc();
        snap = runtime.snapshot();
        editor.setSnapshot(snap);
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
    editor.setSnapshot(snap);
    setStatusMessage(`Paused · docstep ${(snap as any).docstep ?? 0}`);
  }

  function handleStep() {
    if (!runtime) return;
    stopTimer();
    try {
      runtime.stepDoc();
      const snap = runtime.snapshot();
      editor.setSnapshot(snap);
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
      editor.setSnapshot(snap);
      if (editor.state.doc) {
        syncParamValuesFromDoc(editor.state.doc, snap);
      }
      setStatusMessage("Reset · docstep 0");
      lastDocstepRef.current = null;
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
        editor.setSnapshot(snap);
        setStatusMessage(`Param ${name} = ${String(value)} · docstep ${(snap as any).docstep ?? 0}`);
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        setParseError(msg);
        setStatusMessage("Runtime error");
      }
    }
  }

  const selectedCellMaterial = useMemo(
    () => editor.helpers.getSelectedCellMaterial(editor.state),
    [editor.helpers, editor.state.doc, editor.state.materials, editor.state.selectedCellId],
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col border-t border-slate-200 bg-slate-50">
      <EditorTopBar
        title={editor.state.doc?.meta.title ?? "Untitled Flux document"}
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
        <aside className="flex w-[360px] min-w-[18rem] flex-col border-r border-slate-200 bg-white/70 backdrop-blur-sm">
          <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Materials
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            <MaterialsPanel
              materials={editor.state.materials}
              selectedMaterialName={editor.state.selectedMaterialName}
              boundToSelectedCell={selectedCellMaterial?.name === editor.state.selectedMaterialName ? editor.state.selectedCellId : null}
              onSelectMaterial={(name) => editor.setSelectedMaterialName(name)}
              onAddMaterial={() => {
                const idx = editor.state.materials.length + 1;
                const name = `material${idx}`;
                const next: Material = { name, label: `Material ${idx}`, tags: [], text: { body: "" } };
                editor.addMaterial(next);
                editor.setSelectedMaterialName(name);
              }}
              onUpdateMaterial={(mat) => editor.updateMaterial(mat)}
              onDeleteMaterial={(name) => {
                editor.deleteMaterial(name);
              }}
            />
          </div>
        </aside>

        <div className="flex flex-1 min-w-0 flex-col">
          <div className="flex-1 min-h-0 space-y-3 overflow-auto px-4 py-3">
            <EditorSourcePane source={editor.state.docSource} onChange={editor.setDocSource} />

            {editor.state.selectedCellId && (
              <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
                <div>
                  Selected cell <span className="font-mono text-slate-900">{editor.state.selectedCellId}</span>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-slate-500">Material</span>
                  <select
                    value={selectedCellMaterial?.name ?? ""}
                    onChange={(e) => {
                      editor.updateCellMaterial(editor.state.selectedCellId!, e.target.value || null);
                      if (e.target.value) {
                        editor.setSelectedMaterialName(e.target.value);
                      }
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1"
                  >
                    <option value="">(none)</option>
                    {editor.state.materials.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.label ?? m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <EditorCanvas
              doc={editor.state.doc}
              layout={layout}
              selectedCellId={editor.state.selectedCellId}
              onSelectCell={(cellId, materialRef) => {
                editor.setSelectedCellId(cellId);
                if (materialRef) {
                  editor.setSelectedMaterialName(materialRef);
                }
              }}
            />
          </div>

          <RuntimeConsole parseError={parseError} entries={runtimeEntries} />
        </div>

        <EditorSidebarRight doc={editor.state.doc} paramValues={paramValues} onParamChange={handleParamChange} />
      </div>
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
    <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-2 text-sm backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Flux Editor</span>
        <h1 className="text-sm font-semibold text-slate-900">{props.title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">{props.status ?? ""}</span>

        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={props.onPlay}
            disabled={!props.hasRuntime || props.isPlaying}
            className="rounded-full px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            Play
          </button>
          <button
            type="button"
            onClick={props.onPause}
            disabled={!props.hasRuntime}
            className="rounded-full px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:text-slate-900 disabled:opacity-40"
          >
            Pause
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

function EditorSourcePane(props: { source: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                    <input
                      type="range"
                      min={Number(p.min)}
                      max={Number(p.max)}
                      step={(Number(p.max) - Number(p.min)) / 100 || 0.01}
                      value={Number(current)}
                      onChange={(e) => props.onParamChange(p.name, Number(e.target.value))}
                    />
                  )}

                  {p.type === "bool" && (
                    <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(current)}
                        onChange={(e) => props.onParamChange(p.name, e.target.checked)}
                      />
                      <span>{String(current)}</span>
                    </label>
                  )}

                  {p.type === "string" && (
                    <input
                      type="text"
                      value={String(current)}
                      onChange={(e) => props.onParamChange(p.name, e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px]"
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
