import type { FluxCell, FluxDocument, Material } from "@flux-lang/core";

export interface CellPresetPatch {
  content?: string;
  tagsToAdd?: string[];
  dynamic?: number;
  density?: number;
  salience?: number;
  mediaId?: string;
  numericFields?: Record<string, number>;
}

export function materialToCellPreset(material: Material): CellPresetPatch {
  const tagsToAdd = material.tags ?? [];

  const hasScoreText = (material as any).score && typeof (material as any).score.text === "string";

  let content: string | undefined;
  if (hasScoreText) {
    content = (material as any).score.text;
  } else if (material.label) {
    content = material.label;
  } else {
    content = material.name;
  }

  const patch: CellPresetPatch = {
    content,
    tagsToAdd,
    mediaId: material.name,
  };

  return patch;
}

export function applyPresetToCell(cell: FluxCell, patch: CellPresetPatch): void {
  if (patch.content !== undefined) {
    cell.content = patch.content;
  }
  if (patch.tagsToAdd?.length) {
    const existing = new Set(cell.tags ?? []);
    for (const t of patch.tagsToAdd) existing.add(t);
    cell.tags = Array.from(existing);
  }
  if (patch.dynamic !== undefined) {
    if (cell.dynamic === undefined || cell.dynamic === null) {
      cell.dynamic = patch.dynamic;
    }
  }
  if (patch.density !== undefined) {
    if ((cell as any).density === undefined || (cell as any).density === null) {
      (cell as any).density = patch.density;
    }
  }
  if (patch.salience !== undefined) {
    if ((cell as any).salience === undefined || (cell as any).salience === null) {
      (cell as any).salience = patch.salience;
    }
  }
  if (patch.mediaId !== undefined) {
    (cell as any).mediaId = patch.mediaId;
  }
  if (patch.numericFields) {
    cell.numericFields = {
      ...(cell.numericFields ?? {}),
      ...patch.numericFields,
    };
  }
}

export function findMaterialByName(doc: FluxDocument, name: string): Material | undefined {
  return doc.materials?.materials?.find((m) => m.name === name);
}
