import type { EditorLayout } from "../model/layoutAdapter";

export interface RuntimeConsoleEntry {
  id: string;
  message: string;
}

interface RuntimeConsoleProps {
  parseError: string | null;
  entries: RuntimeConsoleEntry[];
}

export function RuntimeConsole({ parseError, entries }: RuntimeConsoleProps) {
  return (
    <div className="border-t border-slate-200 bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
      {parseError ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-red-200">{parseError}</pre>
      ) : (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Now playing / events</div>
          <div className="max-h-40 overflow-auto">
            {entries.length === 0 && <div className="text-slate-500">Ready. Press Apply to parse the source.</div>}
            {entries.map((entry) => (
              <div key={entry.id} className="font-mono text-[11px] text-slate-200">
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function buildRuntimeConsoleEntries(layout: EditorLayout | null): RuntimeConsoleEntry[] {
  if (!layout) return [];
  const active = layout.grids.flatMap((grid) =>
    grid.cells
      .filter((cell) => (cell.dynamic ?? 0) > 0)
      .map((cell) => ({ grid: grid.name, cell })),
  );
  return active.map((entry, idx) => {
    const kind = entry.cell.materialKind ? `[${entry.cell.materialKind}]` : "";
    const matLabel = entry.cell.materialLabel ? `${entry.cell.materialLabel}` : "(no material)";
    const content = entry.cell.content ? `content: "${entry.cell.content}"` : "(empty)";
    const prefix = `[docstep ${layout.docstep}] ${entry.grid}.${entry.cell.id}`;
    return {
      id: `${layout.docstep}-${idx}-${entry.cell.id}`,
      message: `${prefix} → ${content} · ${kind} ${matLabel}`,
    };
  });
}

export default RuntimeConsole;
