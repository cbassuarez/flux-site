import { useCallback, useMemo, useState } from "react";
import type { FluxDocument, Material } from "@flux-lang/core";
import { ensureMaterialsBlock, getMaterialsFromDoc } from "../model/materials";
import type { RuntimeSnapshot } from "../model/runtime";
import { snapshotFromDoc } from "../model/runtime";
import { prettyPrintFluxDocument } from "../serialize/prettyPrintFlux";

export interface FluxEditorState {
  docSource: string;
  doc: FluxDocument | null;
  snapshot: RuntimeSnapshot | null;
  selectedCellId: string | null;
  selectedMaterialName: string | null;
  materials: Material[];
  materialDraft: Material | null;
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
    materialDraft: null,
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
        materialDraft: options?.resetSelection
          ? null
          : (() => {
              const selected = prev.selectedMaterialName;
              if (!selected) return prev.materialDraft;
              const nextMaterials = getMaterialsFromDoc(doc);
              const match = nextMaterials.find((m) => m.name === selected);
              return match ? { ...match } : null;
            })(),
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
    setState((prev) => {
      const match = name ? prev.materials.find((m) => m.name === name) : null;
      return {
        ...prev,
        selectedMaterialName: name,
        materialDraft: match ? { ...match } : null,
      };
    });
  }, []);

  const commitMaterialDraft = useCallback(
    (prev: FluxEditorState, draft: Material, oldName?: string): FluxEditorState => {
      if (!prev.doc) return prev;

      const trimmedName = draft.name.trim();
      if (!trimmedName) return prev;

      const previousName = oldName ?? draft.name;
      const nextDoc: FluxDocument = {
        ...prev.doc,
        grids: prev.doc.grids.map((grid) => ({
          ...grid,
          cells: grid.cells.map((cell) => {
            if (cell.mediaId === previousName || cell.mediaId === trimmedName) {
              return {
                ...cell,
                mediaId: trimmedName,
                content: draft.label ?? trimmedName,
              };
            }
            return cell;
          }),
        })),
        materials: prev.doc.materials
          ? { materials: [...prev.doc.materials.materials] }
          : { materials: [...prev.materials] },
      };

      const materialsBlock = ensureMaterialsBlock(nextDoc);
      const filtered = materialsBlock.materials.filter(
        (m) => m.name !== previousName && m.name !== trimmedName,
      );
      materialsBlock.materials = [...filtered, { ...draft, name: trimmedName }];

      const nextSource = prettyPrintFluxDocument(nextDoc);
      const nextMaterials = getMaterialsFromDoc(nextDoc);

      return {
        ...prev,
        doc: nextDoc,
        materials: nextMaterials,
        materialDraft: { ...draft, name: trimmedName },
        selectedMaterialName: trimmedName,
        docSource: nextSource,
        snapshot: snapshotFromDoc(nextDoc),
        isDirty: true,
      };
    },
    [],
  );

  const setMaterialDraft = useCallback(
    (updater: (draft: Material | null) => Material | null) => {
      setState((prev) => ({
        ...prev,
        materialDraft: updater(prev.materialDraft),
      }));
    },
    [],
  );

  const startNewMaterialDraft = useCallback(() => {
    setState((prev) => {
      const existingNames = new Set(prev.materials.map((m) => m.name));
      let counter = prev.materials.length + 1;
      let name = `material${counter}`;
      while (existingNames.has(name)) {
        counter += 1;
        name = `material${counter}`;
      }

      const draft: Material = {
        name,
        label: `Material ${counter}`,
        tags: [],
        color: "#00cdfe",
        text: { body: "" } as any,
      };

      return {
        ...prev,
        selectedMaterialName: name,
        materialDraft: draft,
      };
    });
  }, []);

  const saveMaterialDraft = useCallback(() => {
    setState((prev) => {
      if (!prev.materialDraft) return prev;
      return commitMaterialDraft(prev, prev.materialDraft, prev.selectedMaterialName ?? undefined);
    });
  }, [commitMaterialDraft]);

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
        materialDraft: selectedMaterialName ? prev.materialDraft : null,
        docSource: nextSource,
        snapshot: nextDoc ? snapshotFromDoc(nextDoc) : prev.snapshot,
        isDirty: true,
      };
    });
  }, []);

  const updateCellMaterial = useCallback((cellId: string, materialName: string | null) => {
    setState((prev) => {
      if (!prev.doc) return prev;
      const material = materialName ? prev.materials.find((m) => m.name === materialName) : null;

      const nextDoc: FluxDocument = {
        ...prev.doc,
        grids: prev.doc.grids.map((grid) => ({
          ...grid,
          cells: grid.cells.map((cell) =>
            cell.id === cellId
              ? {
                  ...cell,
                  mediaId: materialName ?? undefined,
                  content: material ? material.label ?? material.name : cell.content,
                }
              : cell,
          ),
        })),
        materials: prev.doc.materials
          ? { materials: [...prev.doc.materials.materials] }
          : { materials: [...prev.materials] },
      };

      if (nextDoc.materials) {
        ensureMaterialsBlock(nextDoc).materials = [...prev.materials];
      }

      const selectedMaterialName = materialName ?? prev.selectedMaterialName;
      const nextSource = prettyPrintFluxDocument(nextDoc);
      return {
        ...prev,
        doc: nextDoc,
        selectedMaterialName,
        materialDraft: material ? { ...material } : prev.materialDraft,
        docSource: nextSource,
        snapshot: snapshotFromDoc(nextDoc),
        isDirty: true,
      };
    });
  }, []);

  const applyMaterialToSelection = useCallback(() => {
    setState((prev) => {
      if (!prev.doc || !prev.selectedMaterialName) return prev;

      const targetCellIds = prev.selectedCellId ? [prev.selectedCellId] : [];
      if (targetCellIds.length === 0) return prev;

      const material = prev.materials.find((m) => m.name === prev.selectedMaterialName);
      if (!material) return prev;

      const nextDoc: FluxDocument = {
        ...prev.doc,
        grids: prev.doc.grids.map((grid) => ({
          ...grid,
          cells: grid.cells.map((cell) =>
            targetCellIds.includes(cell.id)
              ? { ...cell, mediaId: material.name, content: material.label ?? material.name }
              : cell,
          ),
        })),
        materials: prev.doc.materials
          ? { materials: [...prev.doc.materials.materials] }
          : { materials: [...prev.materials] },
      };

      const materialsBlock = ensureMaterialsBlock(nextDoc);
      materialsBlock.materials = [...prev.materials];

      const nextSource = prettyPrintFluxDocument(nextDoc);

      return {
        ...prev,
        doc: nextDoc,
        materials: getMaterialsFromDoc(nextDoc),
        docSource: nextSource,
        snapshot: snapshotFromDoc(nextDoc),
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
    setMaterialDraft,
    startNewMaterialDraft,
    saveMaterialDraft,
    deleteMaterial,
    updateCellMaterial,
    applyMaterialToSelection,
    helpers,
  };
}
