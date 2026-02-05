import { parseDocument, type DocumentNode, type FluxDocument } from "@flux-lang/core";
import { fetchEditSource, fetchEditState, postTransform, type TransformRequest } from "./api";

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

export type DocServiceState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  doc: EditorDoc | null;
};

export type DocService = {
  getState: () => DocServiceState;
  subscribe: (listener: () => void) => () => void;
  loadDoc: () => Promise<DocServiceState>;
  applyTransform: (transform: TransformRequest, options?: { pushHistory?: boolean }) => Promise<DocServiceState>;
  saveDoc: (source: string) => Promise<DocServiceState>;
  undo: () => Promise<DocServiceState | null>;
  redo: () => Promise<DocServiceState | null>;
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
  let state: DocServiceState = { status: "idle", doc: null };
  const listeners = new Set<() => void>();
  let undoStack: string[] = [];
  let redoStack: string[] = [];

  const setState = (next: DocServiceState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const refreshFromServer = async (overrideSource?: string, overrideState?: Record<string, unknown> | null) => {
    const [statePayload, sourcePayload] = await Promise.all([
      fetchEditState(),
      overrideSource ? Promise.resolve({ source: overrideSource } as SourcePayload) : fetchEditSource(),
    ]);
    const mergedState = overrideState ?? (statePayload as Record<string, unknown>);
    const source = overrideSource ?? sourcePayload?.source ?? "";
    const docPath = (mergedState?.path as string | undefined) ?? sourcePayload?.docPath;
    const astFromState = (mergedState as any)?.doc ?? (mergedState as any)?.ast ?? null;
    const ast =
      astFromState && typeof astFromState === "object" ? (astFromState as FluxDocument) : parseDoc(source, docPath);
    const index = buildIndex(ast);
    const assetsIndex = buildAssetsIndex((mergedState as any)?.assets ?? (statePayload as any)?.assets);

    const nextDoc: EditorDoc = {
      source,
      ast,
      index,
      assetsIndex,
      diagnostics: (mergedState as any)?.diagnostics ?? (statePayload as any)?.diagnostics,
      revision: (mergedState as any)?.revision ?? sourcePayload?.revision,
      lastValidRevision: (mergedState as any)?.lastValidRevision ?? sourcePayload?.lastValidRevision,
      docPath,
      title: (mergedState as any)?.title,
      previewPath: (mergedState as any)?.previewPath ?? (statePayload as any)?.previewPath ?? "/preview",
      capabilities: (mergedState as any)?.capabilities,
    };

    setState({ status: "ready", doc: nextDoc });
    return state;
  };

  const loadDoc = async () => {
    setState({ ...state, status: "loading", error: undefined });
    try {
      return await refreshFromServer();
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      setState({ status: "error", error: message, doc: state.doc });
      return state;
    }
  };

  const applyTransform = async (transform: TransformRequest, options?: { pushHistory?: boolean }) => {
    const prevSource = state.doc?.source ?? "";
    try {
      const payload = await postTransform(transform);
      const ok = (payload as any)?.ok !== false;
      const nextState = extractStateFromPayload(payload);
      if (!ok) {
        const diagnostics = (payload as any)?.diagnostics ?? nextState?.diagnostics ?? state.doc?.diagnostics;
        const nextDoc = state.doc ? { ...state.doc, diagnostics } : state.doc;
        setState({ status: "ready", doc: nextDoc, error: (payload as any)?.error as string | undefined });
        return state;
      }

      if (options?.pushHistory !== false) {
        if (prevSource) undoStack = [...undoStack, prevSource].slice(-50);
        redoStack = [];
      }

      const nextSource = typeof (payload as any)?.source === "string" ? (payload as any).source : undefined;
      return await refreshFromServer(nextSource, nextState);
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      setState({ status: "error", error: message, doc: state.doc });
      return state;
    }
  };

  const saveDoc = async (source: string) => {
    return applyTransform({ op: "setSource", args: { source } }, { pushHistory: false });
  };

  const undo = async () => {
    if (!undoStack.length) return null;
    const previous = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    if (state.doc?.source) {
      redoStack = [...redoStack, state.doc.source].slice(-50);
    }
    return saveDoc(previous);
  };

  const redo = async () => {
    if (!redoStack.length) return null;
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    if (state.doc?.source) {
      undoStack = [...undoStack, state.doc.source].slice(-50);
    }
    return saveDoc(next);
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const getState = () => state;

  return {
    getState,
    subscribe,
    loadDoc,
    applyTransform,
    saveDoc,
    undo,
    redo,
  };
}
