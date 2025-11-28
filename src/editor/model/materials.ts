import type { FluxDocument, MaterialsBlock, Material } from "@flux-lang/core";

// The main buckets we want to present in the UI.
// A material can technically have multiple facets, but we treat one as primary.
export type MaterialKind = "audio" | "video" | "text" | "soundfont" | "other";

export interface MaterialWithKind extends Material {
  kind: MaterialKind;
}

// Infer a primary kind for a material based on which facet(s) are present.
// We keep the logic simple and stable.
export function inferMaterialKind(material: Material): MaterialKind {
  if (material.audio) return "audio";
  if (material.video) return "video";
  if (material.text) return "text";
  if (material.soundfont) return "soundfont";
  // If it only has score/midi/etc, we treat it as "other" for now.
  return "other";
}

export function getMaterialsFromDoc(doc: FluxDocument | null | undefined): Material[] {
  return doc?.materials?.materials ?? [];
}

export function ensureMaterialsBlock(doc: FluxDocument): MaterialsBlock {
  if (!doc.materials) {
    doc.materials = { materials: [] };
  }
  return doc.materials;
}
