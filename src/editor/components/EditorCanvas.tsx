import type { FluxDocument } from "@flux-lang/core";
import type { EditorLayout } from "../model/layoutAdapter";

interface EditorCanvasProps {
  doc: FluxDocument | null;
  layout: EditorLayout | null;
  selectedCellId: string | null;
  onSelectCell?: (cellId: string, materialRef?: string | null) => void;
}

export function EditorCanvas({ doc, layout, selectedCellId, onSelectCell }: EditorCanvasProps) {
  return (
    <main className="flex-1 min-w-0 bg-slate-100 px-4 py-3">
      <div className="flex h-full flex-col gap-3">
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
              {doc && <span className="text-[11px] text-slate-400">{doc.meta.title}</span>}
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
                    {grid.cells.map((cell) => (
                      <div
                        key={cell.id}
                        onClick={() => onSelectCell?.(cell.id, cell.materialRef ?? null)}
                        className={[
                          "flex aspect-square flex-col items-start justify-between rounded bg-white px-2 py-2 text-[11px] text-slate-700 cursor-pointer",
                          cell.id === selectedCellId ? "ring-2 ring-slate-900" : "",
                        ].join(" ")}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <span className="truncate font-medium">{cell.content || "·"}</span>
                          <span className="text-[10px] text-slate-400">{cell.dynamic?.toFixed?.(2)}</span>
                        </div>
                        {cell.materialLabel && (
                          <div
                            className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                            style={
                              cell.materialColor
                                ? { backgroundColor: `${cell.materialColor}20`, borderColor: cell.materialColor }
                                : undefined
                            }
                          >
                            <span
                              className="h-2 w-2 rounded-full border border-slate-400"
                              style={cell.materialColor ? { backgroundColor: cell.materialColor } : undefined}
                            />
                            <span>{cell.materialLabel}</span>
                          </div>
                        )}
                      </div>
                    ))}
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

export default EditorCanvas;
