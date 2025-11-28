import { initRuntimeState, runDocstepOnce } from "@flux-lang/core";
import type { FluxDocument } from "@flux-lang/core";

export type RuntimeSnapshot = {
  docstep: number;
  params: Record<string, any>;
  grids: Record<
    string,
    {
      name: string;
      rows: number;
      cols: number;
      cells: { id: string; tags: string[]; content: string; dynamic?: number }[];
    }
  >;
};

export type Runtime = {
  snapshot: () => RuntimeSnapshot;
  stepDoc: () => void;
  reset: () => void;
  updateParam?: (name: string, value: number | boolean | string) => void;
};

export function snapshotFromDoc(doc: FluxDocument): RuntimeSnapshot {
  const state = initRuntimeState(doc);
  return {
    docstep: (state as any).docstepIndex ?? 0,
    params: { ...(state as any).params },
    grids: (state as any).grids,
  } as RuntimeSnapshot;
}

export function createRuntime(doc: FluxDocument, _options?: { clock?: string }): Runtime {
  let state = initRuntimeState(doc);

  function toSnapshot(): RuntimeSnapshot {
    return {
      docstep: (state as any).docstepIndex ?? 0,
      params: { ...(state as any).params },
      grids: (state as any).grids,
    };
  }

  return {
    snapshot: () => toSnapshot(),
    stepDoc() {
      state = runDocstepOnce(doc, state);
    },
    reset() {
      state = initRuntimeState(doc);
    },
    updateParam(name: string, value: number | boolean | string) {
      state = {
        ...(state as any),
        params: {
          ...(state as any).params,
          [name]: value,
        },
      } as any;
    },
  };
}

export function getDocstepIntervalHint(_doc: FluxDocument, snapshot: RuntimeSnapshot) {
  const tempo = snapshot.params?.tempo;
  if (typeof tempo === "number" && tempo > 0) {
    return { ms: 60000 / tempo };
  }
  return { ms: 1000 };
}
