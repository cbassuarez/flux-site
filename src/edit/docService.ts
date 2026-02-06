import { parseDocument, type DocumentNode, type FluxDocument, type RefreshPolicy } from "@flux-lang/core";
import type { JSONContent } from "@tiptap/core";
import { fetchEditSource, fetchEditState, postTransform, type TransformRequest } from "./api";
import { tiptapToFluxText } from "./richText";

export type DocIndexEntry = {
  id: string;
  node: DocumentNode;
  parentId: string | null;
  path: string[];
  depth: number;
};

export type AssetItem = {
  id: string;
  name: string;
  kind: string;
  path: string;
  tags: string[];
  bankName?: string | null;
  source?: { type: string; name: string };
  meta?: Record<string, unknown>;
};

export type EditorDoc = {
  source: string;
  ast: FluxDocument | null;
  index: Map<string, DocIndexEntry>;
  assetsIndex: AssetItem[];
  diagnostics?: unknown;
  revision?: number;
  lastValidRevision?: number;
  docPath?: string;
  title?: string;
  previewPath?: string;
  capabilities?: Record<string, unknown>;
};

export type EditorSelection = {
  id: string | null;
  kind?: string | null;
};

export type RuntimeInputs = {
  seed: number;
  time: number;
  docstep: number;
};

type SlotTransition = { kind: string; [key: string]: unknown };

export type EditorTransform =
  | { type: "setTextNodeContent"; id: string; text?: string; richText?: JSONContent }
  | { type: "setNodeProps"; id: string; props: Record<string, unknown> }
  | { type: "setSlotProps"; id: string; reserve?: string; fit?: string; refresh?: RefreshPolicy; transition?: SlotTransition }
  | { type: "setSlotGenerator"; id: string; generator: Record<string, unknown> }
  | { type: "reorderNode"; id: string; parentId: string; index: number }
  | { type: "replaceNode"; id: string; node: DocumentNode }
  | { type: "setSource"; source: string }
  | { type: "server"; request: TransformRequest };

export type ApplyTransformResult = {
  ok: boolean;
  nextAst: FluxDocument | null;
  nextSource: string;
  diagnostics?: unknown;
  error?: string;
};

export type DocServiceState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  doc: EditorDoc | null;
  selection: EditorSelection;
  runtime: RuntimeInputs;
  isApplying: boolean;
};

export type DocService = {
  getState: () => DocServiceState;
  subscribe: (listener: () => void) => () => void;
  loadDoc: () => Promise<DocServiceState>;
  applyTransform: (transform: EditorTransform | TransformRequest, options?: { pushHistory?: boolean }) => Promise<ApplyTransformResult>;
  saveDoc: (source: string) => Promise<DocServiceState>;
  undo: () => Promise<DocServiceState | null>;
  redo: () => Promise<DocServiceState | null>;
  setSelection: (id: string | null, kind?: string | null) => void;
  setRuntimeInputs: (inputs: Partial<RuntimeInputs>) => void;
};

type SourcePayload = Awaited<ReturnType<typeof fetchEditSource>>;

function buildIndex(doc: FluxDocument | null): Map<string, DocIndexEntry> {
  const map = new Map<string, DocIndexEntry>();
  if (!doc?.body?.nodes) return map;

  const visit = (node: DocumentNode, parentId: string | null, path: string[], depth: number) => {
    const entry: DocIndexEntry = { id: node.id, node, parentId, path, depth };
    map.set(node.id, entry);
    node.children?.forEach((child) => visit(child, node.id, [...path, node.id], depth + 1));
  };

  doc.body.nodes.forEach((node) => visit(node, null, [], 0));
  return map;
}

function buildAssetsIndex(raw: unknown): AssetItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const source = record.source as { type?: string; name?: string } | undefined;
      const tags = Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : [];
      return {
        id: String(record.id ?? ""),
        name: String(record.name ?? record.path ?? record.id ?? "asset"),
        kind: String(record.kind ?? "asset"),
        path: String(record.path ?? ""),
        tags,
        bankName: source?.type === "bank" ? String(source.name ?? "") : null,
        source: source?.type ? { type: String(source.type), name: String(source.name ?? "") } : undefined,
        meta: typeof record.meta === "object" && record.meta ? (record.meta as Record<string, unknown>) : undefined,
      } as AssetItem;
    })
    .filter((item): item is AssetItem => Boolean(item && item.id));
}

function parseDoc(source: string, docPath?: string): FluxDocument | null {
  if (!source.trim()) return null;
  try {
    return parseDocument(source, {
      sourcePath: docPath ?? "document.flux",
      resolveIncludes: false,
    });
  } catch {
    return null;
  }
}

function extractStateFromPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.state && typeof record.state === "object") return record.state as Record<string, unknown>;
  if (record.updatedState && typeof record.updatedState === "object") return record.updatedState as Record<string, unknown>;
  if (record.doc || record.diagnostics || record.title || record.path || record.capabilities) {
    return record as Record<string, unknown>;
  }
  return null;
}

export function createDocService(): DocService {
  let state: DocServiceState = {
    status: "idle",
    doc: null,
    selection: { id: null, kind: null },
    runtime: { seed: 0, time: 0, docstep: 0 },
    isApplying: false,
  };
  const listeners = new Set<() => void>();
  let undoStack: string[] = [];
  let redoStack: string[] = [];

  const setState = (next: DocServiceState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const refreshFromPayload = async (
    payload: unknown,
    overrideSource?: string,
    overrideState?: Record<string, unknown> | null,
  ): Promise<EditorDoc | null> => {
    const payloadState = extractStateFromPayload(payload) ?? overrideState ?? (payload as Record<string, unknown>);
    const source =
      overrideSource ??
      (typeof (payload as any)?.source === "string" ? ((payload as any).source as string) : undefined) ??
      (payloadState?.source as string | undefined) ??
      state.doc?.source ??
      "";
    const docPath = (payloadState?.path as string | undefined) ?? state.doc?.docPath;
    const astFromState = (payloadState as any)?.doc ?? (payloadState as any)?.ast ?? null;
    const ast = astFromState && typeof astFromState === "object" ? (astFromState as FluxDocument) : parseDoc(source, docPath);
    const index = buildIndex(ast);
    const assetsIndex = buildAssetsIndex((payloadState as any)?.assets ?? (payload as any)?.assets);
    const nextDoc: EditorDoc = {
      source,
      ast,
      index,
      assetsIndex,
      diagnostics: (payloadState as any)?.diagnostics ?? state.doc?.diagnostics,
      revision: (payloadState as any)?.revision ?? (payload as any)?.revision ?? state.doc?.revision,
      lastValidRevision:
        (payloadState as any)?.lastValidRevision ?? (payload as any)?.lastValidRevision ?? state.doc?.lastValidRevision,
      docPath,
      title: (payloadState as any)?.title ?? state.doc?.title,
      previewPath: (payloadState as any)?.previewPath ?? state.doc?.previewPath ?? "/preview",
      capabilities: (payloadState as any)?.capabilities ?? state.doc?.capabilities,
    };

    const nextRuntime = extractRuntimeInputs(payloadState, state.runtime);
    const nextSelection = normalizeSelection(state.selection, index);
    setState({
      status: "ready",
      doc: nextDoc,
      error: undefined,
      selection: nextSelection,
      runtime: nextRuntime,
      isApplying: false,
    });
    return nextDoc;
  };

  const refreshFromServer = async (overrideSource?: string, overrideState?: Record<string, unknown> | null) => {
    const [statePayloadRaw, sourcePayload] = await Promise.all([
      fetchEditState(),
      overrideSource ? Promise.resolve({ source: overrideSource } as SourcePayload) : fetchEditSource(),
    ]);
    const extractedState = extractStateFromPayload(statePayloadRaw) ?? (statePayloadRaw as Record<string, unknown>);
    const mergedState = overrideState ?? extractedState;
    const source = overrideSource ?? sourcePayload?.source ?? "";
    const docPath = (mergedState?.path as string | undefined) ?? sourcePayload?.docPath;
    const astFromState = (mergedState as any)?.doc ?? (mergedState as any)?.ast ?? null;
    const ast =
      astFromState && typeof astFromState === "object" ? (astFromState as FluxDocument) : parseDoc(source, docPath);
    const index = buildIndex(ast);
    const assetsIndex = buildAssetsIndex((mergedState as any)?.assets ?? (statePayloadRaw as any)?.assets);
    const nextRuntime = extractRuntimeInputs(mergedState, state.runtime);

    const nextDoc: EditorDoc = {
      source,
      ast,
      index,
      assetsIndex,
      diagnostics: (mergedState as any)?.diagnostics ?? (statePayloadRaw as any)?.diagnostics,
      revision: (mergedState as any)?.revision ?? sourcePayload?.revision,
      lastValidRevision: (mergedState as any)?.lastValidRevision ?? sourcePayload?.lastValidRevision,
      docPath,
      title: (mergedState as any)?.title,
      previewPath: (mergedState as any)?.previewPath ?? (statePayloadRaw as any)?.previewPath ?? "/preview",
      capabilities: (mergedState as any)?.capabilities,
    };

    const nextSelection = normalizeSelection(state.selection, index);
    setState({ status: "ready", doc: nextDoc, selection: nextSelection, runtime: nextRuntime, isApplying: false });
    return state;
  };

  const loadDoc = async () => {
    setState({ ...state, status: "loading", error: undefined, isApplying: false });
    try {
      return await refreshFromServer();
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      setState({ status: "error", error: message, doc: state.doc, selection: state.selection, runtime: state.runtime, isApplying: false });
      return state;
    }
  };

  const applyTransform = async (transform: EditorTransform | TransformRequest, options?: { pushHistory?: boolean }) => {
    const prevSource = state.doc?.source ?? "";
    let errorMessage: string | undefined;
    setState({ ...state, isApplying: true, error: undefined });
    const { request, fallback } = buildTransformRequest(transform, state.doc);
    let usedFallback = false;
    try {
      let payload: unknown;
      let ok = false;
      try {
        payload = await postTransform(request);
        ok = (payload as any)?.ok !== false;
      } catch (error) {
        if (fallback) {
          payload = await postTransform(fallback);
          ok = (payload as any)?.ok !== false;
          usedFallback = true;
        } else {
          throw error;
        }
      }

      if (!ok && fallback && !usedFallback) {
        payload = await postTransform(fallback);
        ok = (payload as any)?.ok !== false;
        usedFallback = true;
      }

      const nextState = extractStateFromPayload(payload) ?? null;
      if (!ok) {
        const diagnostics = (payload as any)?.diagnostics ?? nextState?.diagnostics ?? state.doc?.diagnostics;
        const nextDoc = state.doc ? { ...state.doc, diagnostics } : state.doc;
        errorMessage = (payload as any)?.error as string | undefined;
        setState({
          status: "ready",
          doc: nextDoc,
          error: errorMessage,
          selection: state.selection,
          runtime: state.runtime,
          isApplying: false,
        });
        return {
          ok: false,
          nextAst: nextDoc?.ast ?? null,
          nextSource: nextDoc?.source ?? prevSource,
          diagnostics: nextDoc?.diagnostics,
          error: errorMessage,
        };
      }

      if (options?.pushHistory !== false) {
        if (prevSource) undoStack = [...undoStack, prevSource].slice(-50);
        redoStack = [];
      }

      const nextSource = typeof (payload as any)?.source === "string" ? (payload as any).source : undefined;
      const nextDoc = await refreshFromPayload(payload, nextSource, nextState);

      return {
        ok: true,
        nextAst: nextDoc?.ast ?? null,
        nextSource: nextDoc?.source ?? prevSource,
        diagnostics: nextDoc?.diagnostics,
      };
    } catch (error) {
      errorMessage = (error as Error)?.message ?? String(error);
      setState({
        status: "error",
        error: errorMessage,
        doc: state.doc,
        selection: state.selection,
        runtime: state.runtime,
        isApplying: false,
      });
      return {
        ok: false,
        nextAst: state.doc?.ast ?? null,
        nextSource: state.doc?.source ?? prevSource,
        diagnostics: state.doc?.diagnostics,
        error: errorMessage,
      };
    } finally {
      if (state.isApplying) {
        setState({ ...state, isApplying: false });
      }
    }
  };

  const saveDoc = async (source: string) => {
    const result = await applyTransform({ type: "setSource", source }, { pushHistory: false });
    return state;
  };

  const undo = async () => {
    if (!undoStack.length) return null;
    const previous = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    if (state.doc?.source) {
      redoStack = [...redoStack, state.doc.source].slice(-50);
    }
    await saveDoc(previous);
    return state;
  };

  const redo = async () => {
    if (!redoStack.length) return null;
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    if (state.doc?.source) {
      undoStack = [...undoStack, state.doc.source].slice(-50);
    }
    await saveDoc(next);
    return state;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const getState = () => state;

  const setSelection = (id: string | null, kind?: string | null) => {
    const normalized = id ? id : null;
    if (state.selection.id === normalized && state.selection.kind === (kind ?? state.selection.kind)) return;
    setState({ ...state, selection: { id: normalized, kind: kind ?? null } });
  };

  const setRuntimeInputs = (inputs: Partial<RuntimeInputs>) => {
    const next = { ...state.runtime, ...inputs };
    setState({ ...state, runtime: next });
  };

  return {
    getState,
    subscribe,
    loadDoc,
    applyTransform,
    saveDoc,
    undo,
    redo,
    setSelection,
    setRuntimeInputs,
  };
}

function normalizeSelection(selection: EditorSelection, index: Map<string, DocIndexEntry>): EditorSelection {
  if (!selection.id) return { id: null, kind: selection.kind ?? null };
  const entry = index.get(selection.id);
  if (!entry) return { id: null, kind: null };
  return { id: selection.id, kind: entry.node.kind };
}

function extractRuntimeInputs(raw: Record<string, unknown> | null | undefined, previous: RuntimeInputs): RuntimeInputs {
  if (!raw || typeof raw !== "object") return previous;
  const runtime =
    (raw as any).runtime ??
    (raw as any).snapshot ??
    (raw as any).state ??
    (raw as any).runtimeState ??
    null;
  const seed = readNumber(runtime?.seed ?? runtime?.randomSeed ?? (raw as any).seed ?? previous.seed);
  const time = readNumber(runtime?.time ?? runtime?.clock ?? (raw as any).time ?? previous.time);
  const docstep = readNumber(runtime?.docstep ?? runtime?.step ?? (raw as any).docstep ?? previous.docstep);
  return { seed, time, docstep };
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function buildTransformRequest(transform: EditorTransform | TransformRequest, doc?: EditorDoc | null): {
  request: TransformRequest;
  fallback?: TransformRequest;
} {
  if ("op" in transform) return { request: transform };
  if (transform.type === "server") return { request: transform.request };
  if (transform.type === "setSource") {
    return { request: { op: "setSource", args: { source: transform.source } } };
  }
  if (transform.type === "replaceNode") {
    return { request: { op: "replaceNode", args: { id: transform.id, node: transform.node } } };
  }
  if (transform.type === "setTextNodeContent") {
    const request: TransformRequest = {
      op: "setTextNodeContent",
      args: {
        id: transform.id,
        nodeId: transform.id,
        text: transform.text,
        richText: transform.richText,
      },
    };
    const fallback = buildTextReplaceNodeFallback(transform, doc);
    return { request, fallback };
  }
  if (transform.type === "setNodeProps") {
    return {
      request: {
        op: "setNodeProps",
        args: { id: transform.id, nodeId: transform.id, props: transform.props },
      },
    };
  }
  if (transform.type === "setSlotProps") {
    const request: TransformRequest = {
      op: "setSlotProps",
      args: {
        id: transform.id,
        slotId: transform.id,
        reserve: transform.reserve,
        fit: transform.fit,
        refresh: transform.refresh,
        transition: transform.transition,
      },
    };
    const fallback = buildSlotPropsFallback(transform, doc);
    return {
      request,
      fallback,
    };
  }
  if (transform.type === "setSlotGenerator") {
    const request: TransformRequest = {
      op: "setSlotGenerator",
      args: {
        id: transform.id,
        slotId: transform.id,
        generator: transform.generator,
      },
    };
    const fallback = buildSlotGeneratorFallback(transform, doc);
    return {
      request,
      fallback,
    };
  }
  if (transform.type === "reorderNode") {
    return {
      request: {
        op: "reorderNode",
        args: {
          id: transform.id,
          nodeId: transform.id,
          parentId: transform.parentId,
          index: transform.index,
        },
      },
    };
  }
  return { request: transform as TransformRequest };
}

function buildTextReplaceNodeFallback(
  transform: Extract<EditorTransform, { type: "setTextNodeContent" }>,
  doc?: EditorDoc | null,
): TransformRequest | undefined {
  if (!doc?.index) return undefined;
  const entry = doc.index.get(transform.id);
  if (!entry) return undefined;
  const existingIds = new Set(doc.index.keys());
  let nextNode: DocumentNode | null = null;

  if (transform.richText) {
    nextNode = tiptapToFluxText(entry.node, transform.richText, existingIds);
  } else if (typeof transform.text === "string") {
    const nextProps: Record<string, any> = { ...(entry.node.props ?? {}) };
    nextProps.content = { kind: "LiteralValue", value: transform.text };
    nextNode = { ...entry.node, props: nextProps, children: [] };
  }

  if (!nextNode) return undefined;
  return { op: "replaceNode", args: { id: transform.id, node: nextNode } };
}

function buildSlotPropsFallback(
  transform: Extract<EditorTransform, { type: "setSlotProps" }>,
  doc?: EditorDoc | null,
): TransformRequest | undefined {
  if (!doc?.index) return undefined;
  const entry = doc.index.get(transform.id);
  if (!entry) return undefined;
  if (entry.node.kind !== "inline_slot" && entry.node.kind !== "slot") return undefined;
  const nextProps: Record<string, any> = { ...(entry.node.props ?? {}) };
  if (transform.reserve !== undefined) nextProps.reserve = { kind: "LiteralValue", value: transform.reserve };
  if (transform.fit !== undefined) nextProps.fit = { kind: "LiteralValue", value: transform.fit };
  const nextNode: DocumentNode = {
    ...entry.node,
    props: nextProps,
    refresh: transform.refresh ?? entry.node.refresh,
    transition: transform.transition ?? (entry.node as any).transition,
  };
  return { op: "replaceNode", args: { id: transform.id, node: nextNode } };
}

function buildSlotGeneratorFallback(
  transform: Extract<EditorTransform, { type: "setSlotGenerator" }>,
  doc?: EditorDoc | null,
): TransformRequest | undefined {
  if (!doc?.index) return undefined;
  const entry = doc.index.get(transform.id);
  if (!entry) return undefined;
  if (entry.node.kind !== "inline_slot" && entry.node.kind !== "slot") return undefined;
  const nextProps: Record<string, any> = { ...(entry.node.props ?? {}) };
  nextProps.generator = transform.generator as any;
  const nextNode: DocumentNode = {
    ...entry.node,
    props: nextProps,
  };
  return { op: "replaceNode", args: { id: transform.id, node: nextNode } };
}
