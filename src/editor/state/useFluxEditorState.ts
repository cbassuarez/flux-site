import { useCallback, useMemo, useState } from "react";
import type { FluxDocument, Material } from "@flux-lang/core";
import { ensureMaterialsBlock, getMaterialsFromDoc } from "../model/materials";
import type { RuntimeSnapshot } from "../model/runtime";

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

  const setDocument = useCallback((doc: FluxDocument | null, snapshot: RuntimeSnapshot | null) => {
    setState((prev) => ({
      ...prev,
      doc,
      snapshot,
      materials: getMaterialsFromDoc(doc),
      selectedCellId: null,
      selectedMaterialName: null,
    }));
  }, []);

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
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
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
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
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
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        selectedMaterialName,
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
      return {
        ...prev,
        doc: nextDoc,
        selectedMaterialName,
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
    helpers,
  };
}
