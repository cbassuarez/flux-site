import { useState } from "react";
import { createRuntime, parseDocument, type FluxDocument, type RuntimeSnapshot } from "@flux-lang/core";

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
  const [source, setSource] = useState<string>(DEFAULT_SOURCE);

  const [doc, setDoc] = useState<FluxDocument | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);

  const [parseError, setParseError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>("Ready");

  function handleApply() {
    try {
      const parsed = parseDocument(source);
      const rt = createRuntime(parsed, { clock: "manual" });
      const snap = rt.getSnapshot();

      setDoc(parsed);
      setSnapshot(snap);
      setParseError(null);
      setStatusMessage("Parsed OK · docstep 0");
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      setParseError(msg);
      setStatusMessage("Parse error");
      setDoc(null);
      setSnapshot(null);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] border-t border-slate-200 bg-slate-50">
      <EditorTopBar
        title={doc?.meta.title ?? "Untitled Flux document"}
        onApply={handleApply}
        status={statusMessage}
      />

      <div className="flex flex-1 min-h-0">
        <EditorSidebarLeft doc={doc} />
        <EditorCanvas snapshot={snapshot} source={source} onSourceChange={setSource} />
        <EditorSidebarRight doc={doc} />
      </div>

      <EditorConsole parseError={parseError} />
    </div>
  );
}

function EditorTopBar(props: { title: string; onApply: () => void; status: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500">flux editor</span>
        <span className="truncate text-slate-900">{props.title}</span>
      </div>
      <div className="flex items-center gap-3">
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

function EditorSidebarLeft(props: { doc: FluxDocument | null }) {
  return (
    <aside className="flex w-64 min-w-[14rem] max-w-xs flex-col border-r border-slate-200 bg-white/70 backdrop-blur-sm">
      <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Structure
      </div>
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-3 py-3">
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
      </div>
    </aside>
  );
}

function EditorSidebarRight(props: { doc: FluxDocument | null }) {
  return (
    <aside className="flex w-64 min-w-[14rem] max-w-xs flex-col border-l border-slate-200 bg-white/70 backdrop-blur-sm">
      <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Params
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 py-3">
        {!props.doc && <p className="text-xs text-slate-500">Apply a document to see parameters.</p>}

        {props.doc && props.doc.state?.params?.length ? (
          <ul className="space-y-1 text-xs">
            {props.doc.state.params.map((p) => (
              <li key={p.name} className="flex flex-col rounded border border-slate-200 bg-slate-50 px-2 py-1">
                <div className="flex justify-between">
                  <span className="font-mono text-[11px]">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{p.type}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  min={p.min ?? "–"} · max={p.max ?? "–"} · initial={String(p.initial)}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

function EditorSourcePane(props: { source: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
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

function EditorCanvas(props: { snapshot: RuntimeSnapshot | null; source: string; onSourceChange: (value: string) => void }) {
  const layout = props.snapshot;

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
                      const label = cell.content && cell.content.length > 0 ? cell.content : cell.tags[0] ?? "";
                      return (
                        <div
                          key={cell.id}
                          className="flex aspect-square items-center justify-center rounded bg-white text-[11px] text-slate-700"
                        >
                          <span className="truncate px-1">{label || "·"}</span>
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
