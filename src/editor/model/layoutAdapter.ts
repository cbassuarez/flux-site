import type { FluxCell, FluxDocument, FluxGrid, Material } from "@flux-lang/core";
import { inferMaterialKind } from "./materials";
import type { MaterialKind } from "./materials";
import type { RuntimeSnapshot } from "./runtime";

export interface EditorGridCell {
  id: string;
  row: number;
  col: number;
  content: string;
  dynamic: number;

  materialRef?: string;
  materialKind?: MaterialKind;
  materialLabel?: string;
  materialColor?: string;
}

export interface EditorGrid {
  name: string;
  rows: number;
  cols: number;
  cells: EditorGridCell[];
}

export interface EditorLayout {
  docstep: number;
  grids: EditorGrid[];
}

function buildMaterialIndex(doc: FluxDocument | null): Map<string, Material> {
  const index = new Map<string, Material>();
  if (!doc?.materials?.materials) return index;
  for (const mat of doc.materials.materials) {
    index.set(mat.name, mat);
  }
  return index;
}

function buildGridCellIndex(grid: FluxGrid): Map<string, FluxCell> {
  const index = new Map<string, FluxCell>();
  for (const cell of grid.cells) {
    index.set(cell.id, cell);
  }
  return index;
}

export function computeGridLayout(doc: FluxDocument, snapshot: RuntimeSnapshot): EditorLayout {
  const materialIndex = buildMaterialIndex(doc);

  return {
    docstep: snapshot.docstep ?? 0,
    grids: doc.grids.map((grid) => {
      const gridState = snapshot.grids?.[grid.name];
      const rows = gridState?.rows ?? grid.size?.rows ?? 0;
      const cols = gridState?.cols ?? grid.size?.cols ?? 0;
      const cells = gridState?.cells ?? [];
      const docCells = buildGridCellIndex(grid);

      return {
        name: grid.name,
        rows,
        cols,
        cells: cells.map((cell, idx) => {
          const docCell = docCells.get(cell.id);
          const cellMaterial = docCell?.mediaId ? materialIndex.get(docCell.mediaId) : undefined;
          const materialKind = cellMaterial ? inferMaterialKind(cellMaterial) : undefined;

          const row = cols > 0 ? Math.floor(idx / cols) : 0;
          const col = cols > 0 ? idx % cols : 0;

          return {
            id: cell.id,
            row,
            col,
            content: cell.content ?? "",
            dynamic: cell.dynamic ?? 0,
            materialRef: cellMaterial?.name,
            materialKind,
            materialLabel: cellMaterial?.label ?? cellMaterial?.name ?? undefined,
            materialColor: cellMaterial?.color,
          } satisfies EditorGridCell;
        }),
      } satisfies EditorGrid;
    }),
  } satisfies EditorLayout;
}
