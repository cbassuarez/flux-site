import { useCallback, useMemo, useState } from "react";
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
  isDirty: boolean;
}

export function useFluxEditorState(initialSource: string) {
  const [state, setState] = useState<FluxEditorState>({
    docSource: initialSource,
    doc: null,
    snapshot: null,
    selectedCellId: null,
    selectedMaterialName: null,
    materials: [],
    isDirty: false,
  });

  const setDocSource = useCallback((next: string) => {
    setState((prev) => ({ ...prev, docSource: next, isDirty: true }));
  }, []);

  const setDocument = useCallback(
    (
      doc: FluxDocument | null,
      snapshot: RuntimeSnapshot | null,
      options?: { docSource?: string; resetSelection?: boolean; isDirty?: boolean },
    ) => {
      setState((prev) => ({
        ...prev,
        doc,
        snapshot,
        materials: getMaterialsFromDoc(doc),
        selectedCellId: options?.resetSelection ? null : prev.selectedCellId,
        selectedMaterialName: options?.resetSelection ? null : prev.selectedMaterialName,
        docSource: options?.docSource ?? prev.docSource,
        isDirty: options?.isDirty ?? prev.isDirty,
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

      if (nextDoc) {
        for (const grid of nextDoc.grids) {
          grid.cells = grid.cells.map((cell) =>
            cell.mediaId === updated.name
              ? { ...cell, content: updated.label ?? updated.name, mediaId: updated.name }
              : cell,
          );
        }
      }

      const nextSource = nextDoc ? prettyPrintFluxDocument(nextDoc) : prev.docSource;
      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        docSource: nextSource,
        snapshot: nextDoc ? snapshotFromDoc(nextDoc) : prev.snapshot,
        isDirty: true,
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
        isDirty: true,
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
        isDirty: true,
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
        isDirty: true,
      };
    });
  }, []);

  const applyMaterialToSelection = useCallback((materialName: string) => {
    setState((prev) => {
      if (!materialName || !prev.selectedCellId) return prev;
      const doc = prev.doc ? { ...prev.doc, grids: prev.doc.grids.map((g) => ({ ...g, cells: [...g.cells] })) } : null;
      if (!doc) return prev;

      const material = (doc.materials?.materials ?? prev.materials).find((m) => m.name === materialName);
      if (!material) return prev;

      const patch = materialToCellPreset(material);
      let updated = false;

      for (const grid of doc.grids) {
        grid.cells = grid.cells.map((cell) => {
          if (cell.id === prev.selectedCellId) {
            const nextCell = { ...cell } as any;
            applyPresetToCell(nextCell, patch);
            updated = true;
            return nextCell;
          }
          return cell;
        });
      }

      if (!updated) return prev;

      if (!doc.materials && prev.materials.length) {
        doc.materials = { materials: [...prev.materials] };
      }

      const nextSource = prettyPrintFluxDocument(doc);

      return {
        ...prev,
        doc,
        materials: getMaterialsFromDoc(doc),
        docSource: nextSource,
        selectedMaterialName: materialName,
        isDirty: true,
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
