import { useCallback, useMemo, useState } from "react";
import { parseDocument } from "@flux-lang/core";
import type { FluxDocument, Material } from "@flux-lang/core";
import { ensureMaterialsBlock, getMaterialsFromDoc } from "../model/materials";
import type { RuntimeSnapshot } from "../model/runtime";
import { snapshotFromDoc } from "../model/runtime";
import { applyPresetToCell, materialToCellPreset } from "../materials/materialPresets";
import { prettyPrintFluxDocument } from "../serialize/prettyPrintFlux";

export interface FluxEditorState {
  docSource: string;
  doc: FluxDocument | null;
  snapshot: RuntimeSnapshot | null;
  selectedCellId: string | null;
  selectedMaterialName: string | null;
  materials: Material[];
}

export function useFluxEditorState(initialSource: string) {
  const [state, setState] = useState<FluxEditorState>({
    docSource: initialSource,
    doc: null,
    snapshot: null,
    selectedCellId: null,
    selectedMaterialName: null,
    materials: [],
  });

  const setDocSource = useCallback((next: string) => {
    setState((prev) => ({ ...prev, docSource: next }));
  }, []);

  const setDocument = useCallback(
    (doc: FluxDocument | null, snapshot: RuntimeSnapshot | null, options?: { docSource?: string; resetSelection?: boolean }) => {
      setState((prev) => ({
        ...prev,
        doc,
        snapshot,
        materials: getMaterialsFromDoc(doc),
        selectedCellId: options?.resetSelection ? null : prev.selectedCellId,
        selectedMaterialName: options?.resetSelection ? null : prev.selectedMaterialName,
        docSource: options?.docSource ?? prev.docSource,
      }));
    },
    [],
  );

  const setSnapshot = useCallback((snapshot: RuntimeSnapshot | null) => {
    setState((prev) => ({ ...prev, snapshot }));
  }, []);

  const setSelectedCellId = useCallback((cellId: string | null) => {
    setState((prev) => ({ ...prev, selectedCellId: cellId }));
  }, []);

  const setSelectedMaterialName = useCallback((name: string | null) => {
    setState((prev) => ({ ...prev, selectedMaterialName: name }));
  }, []);

  const updateMaterial = useCallback((updated: Material) => {
    setState((prev) => {
      const nextDoc = prev.doc
        ? {
            ...prev.doc,
            materials: prev.doc.materials
              ? { materials: [...prev.doc.materials.materials] }
              : { materials: [] },
          }
        : null;
      const materialsBlock = nextDoc ? ensureMaterialsBlock(nextDoc) : null;
      const nextMaterials = prev.materials.some((m) => m.name === updated.name)
        ? prev.materials.map((m) => (m.name === updated.name ? updated : m))
        : [...prev.materials, updated];
      if (materialsBlock) {
        materialsBlock.materials = nextMaterials;
      }
      const nextSource = nextDoc ? prettyPrintFluxDocument(nextDoc) : prev.docSource;
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        docSource: nextSource,
        snapshot: nextDoc ? snapshotFromDoc(nextDoc) : prev.snapshot,
      };
    });
  }, []);

  const addMaterial = useCallback((newMat: Material) => {
    setState((prev) => {
      const nextDoc = prev.doc
        ? {
            ...prev.doc,
            materials: prev.doc.materials
              ? { materials: [...prev.doc.materials.materials] }
              : { materials: [] },
          }
        : null;
      const materialsBlock = nextDoc ? ensureMaterialsBlock(nextDoc) : null;
      const nextMaterials = [...prev.materials, newMat];
      if (materialsBlock) {
        materialsBlock.materials = nextMaterials;
      }
      const nextSource = nextDoc ? prettyPrintFluxDocument(nextDoc) : prev.docSource;
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        docSource: nextSource,
        snapshot: nextDoc ? snapshotFromDoc(nextDoc) : prev.snapshot,
      };
    });
  }, []);

  const deleteMaterial = useCallback((name: string) => {
    setState((prev) => {
      const nextMaterials = prev.materials.filter((m) => m.name !== name);
      const nextDoc = prev.doc
        ? {
            ...prev.doc,
            materials: prev.doc.materials
              ? { materials: [...prev.doc.materials.materials] }
              : { materials: [] },
          }
        : null;
      const materialsBlock = nextDoc ? ensureMaterialsBlock(nextDoc) : null;
      if (materialsBlock) {
        materialsBlock.materials = nextMaterials;
      }
      const selectedMaterialName = prev.selectedMaterialName === name ? null : prev.selectedMaterialName;
      const nextSource = nextDoc ? prettyPrintFluxDocument(nextDoc) : prev.docSource;
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        selectedMaterialName,
        docSource: nextSource,
        snapshot: nextDoc ? snapshotFromDoc(nextDoc) : prev.snapshot,
      };
    });
  }, []);

  const updateCellMaterial = useCallback((cellId: string, materialName: string | null) => {
    setState((prev) => {
      if (!prev.doc) return prev;
      const nextDoc: FluxDocument = {
        ...prev.doc,
        grids: prev.doc.grids.map((grid) => ({
          ...grid,
          cells: grid.cells.map((cell) =>
            cell.id === cellId
              ? {
                  ...cell,
                  mediaId: materialName ?? undefined,
                }
              : cell,
          ),
        })),
        materials: prev.doc.materials
          ? { materials: [...prev.doc.materials.materials] }
          : prev.doc.materials,
      };
      const selectedMaterialName = materialName ?? prev.selectedMaterialName;
      const nextSource = prettyPrintFluxDocument(nextDoc);
      return {
        ...prev,
        doc: nextDoc,
        selectedMaterialName,
        docSource: nextSource,
        snapshot: snapshotFromDoc(nextDoc),
      };
    });
  }, []);

  const applyMaterialToSelection = useCallback((materialName: string) => {
    setState((prev) => {
      if (!materialName || !prev.selectedCellId) return prev;
      let doc: FluxDocument;
      try {
        doc = parseDocument(prev.docSource);
      } catch {
        return prev;
      }

      const material = (doc.materials?.materials ?? prev.materials).find((m) => m.name === materialName);
      if (!material) return prev;

      const patch = materialToCellPreset(material);
      let updated = false;

      for (const grid of doc.grids) {
        for (const cell of grid.cells) {
          if (cell.id === prev.selectedCellId) {
            applyPresetToCell(cell, patch);
            updated = true;
          }
        }
      }

      if (!updated) return prev;

      if (!doc.materials && prev.materials.length) {
        doc.materials = { materials: [...prev.materials] };
      }

      const nextSource = prettyPrintFluxDocument(doc);
      const nextSnapshot = snapshotFromDoc(doc);

      return {
        ...prev,
        doc,
        materials: getMaterialsFromDoc(doc),
        docSource: nextSource,
        snapshot: nextSnapshot,
        selectedMaterialName: materialName,
      };
    });
  }, []);

  const helpers = useMemo(
    () => ({
      getSelectedCellMaterial(current: FluxEditorState) {
        if (!current.doc || !current.selectedCellId) return undefined;
        for (const grid of current.doc.grids) {
          const cell = grid.cells.find((c) => c.id === current.selectedCellId);
          if (cell?.mediaId) {
            return current.materials.find((m) => m.name === cell.mediaId);
          }
        }
        return undefined;
      },
    }), [],
  );

  return {
    state,
    setDocSource,
    setDocument,
    setSnapshot,
    setSelectedCellId,
    setSelectedMaterialName,
    updateMaterial,
    addMaterial,
    deleteMaterial,
    updateCellMaterial,
    applyMaterialToSelection,
    helpers,
  };
}
