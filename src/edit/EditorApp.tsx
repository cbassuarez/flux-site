import { useCallback, useEffect, useMemo, useState } from "react";
import "./editor.css";
import {
  ApiError,
  fetchEditNode,
  fetchEditOutline,
  fetchEditState,
  postTransform,
  type EditState
} from "./api";
import {
  buildAddCalloutTransform,
  buildAddFigureTransform,
  buildAddParagraphTransform,
  buildAddSectionTransform,
  buildAddTableTransform,
  buildSetTextTransform,
  type AddFigureArgs
} from "./transforms";
import { buildFallbackOutline, normalizeOutline, type OutlineNode } from "./outline";
import { extractDiagnosticsItems, extractDiagnosticsSummary, type DiagnosticItem } from "./diagnostics";

const FIGURE_RESERVES = ["360x240", "640x360", "960x540", "1200x800", "Auto"];
const FIGURE_FITS = ["contain", "scaleDown", "clip", "ellipsis"];

type Toast = {
  kind: "success" | "error" | "info";
  message: string;
};

type FigureFormState = {
  bankName: string;
  tags: string;
  caption: string;
  reserve: string;
  fit: string;
};

type InspectorNode = {
  id: string;
  kind: string;
  props?: Record<string, unknown>;
  text?: string | null;
  editable?: boolean;
  textKind?: string | null;
  childCount?: number;
  label?: string;
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function extractDocTitle(state?: EditState | null): string {
  if (!state) return "Untitled document";
  const directTitle = typeof state.title === "string" ? state.title : undefined;
  const metaTitle =
    typeof (state as any).meta?.title === "string" ? ((state as any).meta?.title as string) : undefined;
  const doc = (state as any).doc;
  const docTitle = doc && typeof doc === "object" ? doc.title ?? doc.meta?.title : undefined;
  return directTitle ?? metaTitle ?? docTitle ?? "Untitled document";
}

function extractDocPath(state?: EditState | null): string {
  if (!state) return "";
  const directPath = typeof state.path === "string" ? state.path : undefined;
  const filePath =
    typeof (state as any).file?.path === "string" ? ((state as any).file?.path as string) : undefined;
  const doc = (state as any).doc;
  const docPath = doc && typeof doc === "object" ? doc.path ?? doc.meta?.path : undefined;
  return directPath ?? filePath ?? docPath ?? "";
}

function extractPreviewPath(state?: EditState | null): string {
  if (!state) return "/";
  const previewPath = typeof state.previewPath === "string" ? state.previewPath : undefined;
  return previewPath ?? "/preview";
}

function withCacheBuster(path: string, nonce: number): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}t=${nonce}`;
}

function canUseCapability(state: EditState | null, key: string): boolean {
  if (!state?.capabilities) return true;
  const caps = state.capabilities as Record<string, unknown>;
  if (typeof caps[key] === "boolean") return caps[key] as boolean;
  if (typeof caps.transforms === "object" && caps.transforms && key in (caps.transforms as Record<string, unknown>)) {
    const value = (caps.transforms as Record<string, unknown>)[key];
    if (typeof value === "boolean") return value;
  }
  return true;
}

function pickStateFromResponse(payload: unknown): EditState | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.state && typeof record.state === "object") return record.state as EditState;
  if (record.updatedState && typeof record.updatedState === "object") return record.updatedState as EditState;
  if (record.doc || record.diagnostics || record.title || record.path || record.capabilities) {
    return payload as EditState;
  }
  return null;
}

function pickDiagnosticsFromResponse(payload: unknown): unknown | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.diagnostics && typeof record.diagnostics === "object") return record.diagnostics as unknown;
  if (record.state && typeof record.state === "object") {
    const state = record.state as Record<string, unknown>;
    if (state.diagnostics && typeof state.diagnostics === "object") return state.diagnostics as unknown;
  }
  return null;
}

function normalizeInspectorNode(payload: unknown, fallback?: OutlineNode | null): InspectorNode | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : fallback?.id;
  const kind = typeof record.kind === "string" ? record.kind : fallback?.kind;
  if (!id || !kind) return null;
  return {
    id,
    kind,
    props: typeof record.props === "object" && record.props ? (record.props as Record<string, unknown>) : undefined,
    text: typeof record.text === "string" ? record.text : record.text === null ? null : undefined,
    editable: typeof record.editable === "boolean" ? record.editable : undefined,
    textKind: typeof record.textKind === "string" ? record.textKind : undefined,
    childCount: typeof record.childCount === "number" ? record.childCount : undefined,
    label: fallback?.label
  };
}

function summarizeProps(node: InspectorNode | null): string {
  if (!node?.props) return "No properties";
  const summary: string[] = [];
  const keys = Object.keys(node.props);
  for (const key of keys) {
    const value = node.props[key] as any;
    if (value && typeof value === "object" && "kind" in value) {
      if (value.kind === "LiteralValue") {
        summary.push(`${key}=${Array.isArray(value.value) ? "[...]" : String(value.value)}`);
      } else if (value.kind === "DynamicValue") {
        summary.push(`${key}=<expr>`);
      }
    }
  }
  if (!summary.length) return "No literal properties";
  return summary.slice(0, 4).join(" · ");
}

function truncateMiddle(value: string, max = 48): string {
  if (value.length <= max) return value;
  const head = Math.max(6, Math.floor((max - 3) / 2));
  const tail = Math.max(6, max - 3 - head);
  return `${value.slice(0, head)}...${value.slice(value.length - tail)}`;
}

function findOutlineNode(nodes: OutlineNode[], id: string): OutlineNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findOutlineNode(node.children ?? [], id);
    if (child) return child;
  }
  return null;
}

export default function EditorApp() {
  const [state, setState] = useState<EditState | null>(null);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [outlineAvailable, setOutlineAvailable] = useState(true);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOutline, setSelectedOutline] = useState<OutlineNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<InspectorNode | null>(null);
  const [editText, setEditText] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "unsupported">("connecting");
  const [previewNonce, setPreviewNonce] = useState(() => Date.now());
  const [figureModalOpen, setFigureModalOpen] = useState(false);
  const [figureForm, setFigureForm] = useState<FigureFormState>({
    bankName: "",
    tags: "",
    caption: "",
    reserve: FIGURE_RESERVES[0],
    fit: FIGURE_FITS[0]
  });
  const [isApplying, setIsApplying] = useState(false);

  const docTitle = useMemo(() => extractDocTitle(state), [state]);
  const docPath = useMemo(() => extractDocPath(state), [state]);
  const previewPath = useMemo(() => extractPreviewPath(state), [state]);
  const previewSrc = useMemo(() => withCacheBuster(previewPath, previewNonce), [previewPath, previewNonce]);
  const propsSummary = useMemo(() => summarizeProps(selectedNode), [selectedNode]);
  const statusLabel =
    savedStatus === "saving" ? "Saving..." : savedStatus === "error" ? "Error" : editDirty ? "Unsaved" : "Saved ✓";
  const statusClass =
    savedStatus === "error"
      ? "text-rose-300"
      : editDirty
        ? "text-amber-300"
        : "text-emerald-300";

  const diagnosticsSummary = useMemo(() => extractDiagnosticsSummary(state?.diagnostics), [state]);
  const diagnosticsItems = useMemo<DiagnosticItem[]>(() => extractDiagnosticsItems(state?.diagnostics), [state]);

  const outlineNodes = useMemo(() => {
    if (outline.length) return outline;
    return buildFallbackOutline(state);
  }, [outline, state]);

  const refreshPreview = useCallback(() => {
    setPreviewNonce(Date.now());
  }, []);

  const loadState = useCallback(async () => {
    const nextState = await fetchEditState();
    setState(nextState);
    if (nextState?.outline) {
      setOutline(normalizeOutline(nextState.outline));
    }
    return nextState;
  }, []);

  const loadOutline = useCallback(
    async (sourceState?: EditState | null) => {
      try {
        const outlinePayload = await fetchEditOutline();
        if (outlinePayload == null) {
          setOutlineAvailable(false);
          setOutlineError(null);
          if (sourceState?.outline) {
            setOutline(normalizeOutline(sourceState.outline));
          }
          return;
        }
        setOutlineAvailable(true);
        setOutlineError(null);
        setOutline(normalizeOutline(outlinePayload));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setOutlineAvailable(false);
          setOutlineError(null);
          if (sourceState?.outline) {
            setOutline(normalizeOutline(sourceState.outline));
          }
        } else {
          setOutlineError((err as Error).message ?? "Failed to load outline");
        }
      }
    },
    []
  );

  const loadNode = useCallback(async (id: string, fallback?: OutlineNode | null) => {
    try {
      const payload = await fetchEditNode(id);
      const normalized = normalizeInspectorNode(payload, fallback ?? null);
      setSelectedNode(normalized);
      setEditText(normalized?.text ?? "");
      setEditDirty(false);
    } catch (err) {
      setSelectedNode(null);
      setEditText("");
      setEditDirty(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const nextState = await loadState();
        if (!active) return;
        await loadOutline(nextState);
      } catch (err) {
        if (!active) return;
        setError(err as Error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadOutline, loadState]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedNode(null);
      setSelectedOutline(null);
      setEditText("");
      setEditDirty(false);
      return;
    }
    const fallback = findOutlineNode(outlineNodes, selectedId);
    setSelectedOutline(fallback);
    loadNode(selectedId, fallback ?? null);
  }, [selectedId, outlineNodes, loadNode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let closed = false;

    try {
      eventSource = new EventSource("/api/events");
      setLiveStatus("connecting");
    } catch {
      setLiveStatus("unsupported");
      return;
    }

    const handleDocChanged = () => {
      if (closed) return;
      refreshPreview();
      loadState().then((nextState) => loadOutline(nextState)).catch(() => undefined);
    };

    eventSource.addEventListener("doc-changed", handleDocChanged);
    eventSource.onmessage = (event) => {
      if (typeof event.data === "string" && event.data.includes("doc-changed")) {
        handleDocChanged();
      }
    };

    eventSource.onopen = () => {
      if (!closed) setLiveStatus("connected");
    };

    eventSource.onerror = () => {
      if (closed) return;
      setLiveStatus("unsupported");
      eventSource?.close();
    };

    return () => {
      closed = true;
      eventSource?.close();
    };
  }, [loadOutline, loadState, refreshPreview]);

  const handleTransform = useCallback(
    async (request: { op: string; args: Record<string, unknown> }, successMessage: string) => {
      setIsApplying(true);
      setSavedStatus("saving");

      try {
        const payload = await postTransform(request);
        const ok = (payload as any)?.ok !== false;
        const nextDiagnostics = pickDiagnosticsFromResponse(payload);

        if (!ok) {
          setState((prev) => (nextDiagnostics ? { ...(prev ?? {}), diagnostics: nextDiagnostics } : prev));
          const message = typeof (payload as any)?.error === "string" ? (payload as any).error : "Transform failed";
          setSavedStatus("error");
          setToast({ kind: "error", message });
          
          return false;
        }

        const nextState = pickStateFromResponse(payload) ?? (await loadState());
        setState(nextState);
        if ((payload as any)?.outline) {
          setOutline(normalizeOutline((payload as any).outline));
        }
        await loadOutline(nextState);
        setSavedStatus("saved");
        setToast({ kind: "success", message: successMessage });
        if (liveStatus !== "connected") {
          refreshPreview();
        }
        return true;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Transform failed";
        setSavedStatus("error");
        setToast({ kind: "error", message });
        return false;
      } finally {
        setIsApplying(false);
      }
    },
    [loadOutline, loadState, liveStatus, refreshPreview]
  );

  const handleAddSection = useCallback(() => {
    return handleTransform(buildAddSectionTransform(), "Section added");
  }, [handleTransform]);

  const handleAddParagraph = useCallback(() => {
    return handleTransform(buildAddParagraphTransform(), "Paragraph added");
  }, [handleTransform]);

  const handleAddCallout = useCallback(() => {
    return handleTransform(buildAddCalloutTransform(), "Callout inserted");
  }, [handleTransform]);

  const handleAddTable = useCallback(() => {
    return handleTransform(buildAddTableTransform(), "Table inserted");
  }, [handleTransform]);

  const handleApplyText = useCallback(async () => {
    if (!selectedNode?.editable) return;
    const ok = await handleTransform(buildSetTextTransform({ id: selectedNode.id, text: editText }), "Text updated");
    if (ok) setEditDirty(false);
  }, [editText, handleTransform, selectedNode]);

  const handleCancelEdit = useCallback(() => {
    setEditText(selectedNode?.text ?? "");
    setEditDirty(false);
  }, [selectedNode]);

  const handleSelectNode = useCallback((node: OutlineNode) => {
    setSelectedId(node.id);
    setSelectedOutline(node);
  }, []);

  const openFigureModal = useCallback(() => {
    setFigureForm({
      bankName: "",
      tags: "",
      caption: "",
      reserve: FIGURE_RESERVES[0],
      fit: FIGURE_FITS[0]
    });
    setFigureModalOpen(true);
  }, []);

  const handleSubmitFigure = useCallback(async () => {
    const payload: AddFigureArgs = {
      bankName: figureForm.bankName,
      tags: parseTags(figureForm.tags),
      caption: figureForm.caption,
      reserve: figureForm.reserve === "Auto" ? "" : figureForm.reserve,
      fit: figureForm.fit
    };
    setFigureModalOpen(false);
    await handleTransform(buildAddFigureTransform(payload), "Figure inserted");
  }, [figureForm, handleTransform]);

  const canAddSection = canUseCapability(state, "addSection");
  const canAddParagraph = canUseCapability(state, "addParagraph");
  const canAddFigure = canUseCapability(state, "addFigure");
  const canAddCallout = canUseCapability(state, "addCallout");
  const canAddTable = canUseCapability(state, "addTable");

  if (loading) {
    return (
      <div className="editor-root flex min-h-screen items-center justify-center text-slate-200">
        <div className="panel w-[360px] animate-fade-up px-6 py-8 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-slate-600 border-t-cyan-400/80 animate-soft-pulse" />
          <p className="text-sm text-slate-300">Loading editor state from the Flux viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof ApiError ? error.message : error.message;
    return (
      <div className="editor-root flex min-h-screen items-center justify-center px-4 text-slate-200">
        <div className="panel w-full max-w-lg animate-fade-up p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="badge">Editor offline</span>
            <button className="btn btn-muted" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Unable to reach /api/edit/state</h1>
          <p className="mt-2 text-sm text-slate-300">
            {message}. Ensure the Flux viewer server is running and serving the editor at <span className="text-slate-100">/edit</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-root flex min-h-screen flex-col text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Flux Guided Transforms</div>
            <div className="mt-1 text-xl font-semibold text-slate-100">{docTitle}</div>
            {docPath ? <div className="text-xs text-slate-400">{docPath}</div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={handleAddSection} disabled={!canAddSection || isApplying}>
              Add Section
            </button>
            <button className="btn btn-primary" onClick={handleAddParagraph} disabled={!canAddParagraph || isApplying}>
              Add Paragraph
            </button>
            <button className="btn btn-primary" onClick={openFigureModal} disabled={!canAddFigure || isApplying}>
              Add Figure
            </button>
            <button className="btn btn-primary" onClick={handleAddCallout} disabled={!canAddCallout || isApplying}>
              Add Callout
            </button>
            <button className="btn btn-primary" onClick={handleAddTable} disabled={!canAddTable || isApplying}>
              Add Table
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <section className="panel flex min-h-0 flex-col">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className="badge">Outline</span>
              {!outlineAvailable ? <span className="text-xs text-slate-500">Fallback</span> : null}
            </div>
            {outlineError ? <span className="text-xs text-rose-300">{outlineError}</span> : null}
          </div>
          <div className="panel-body min-h-0 flex-1 overflow-auto">
            <OutlineTree
              nodes={outlineNodes}
              selectedId={selectedId}
              onSelect={handleSelectNode}
            />
          </div>
        </section>

        <section className="panel flex min-h-0 flex-col">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className="badge">Preview</span>
              <span className="text-xs text-slate-400">{liveStatus === "connected" ? "Live" : "Manual"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-muted" onClick={refreshPreview}>
                Refresh preview
              </button>
            </div>
          </div>
          <div className="panel-body flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/70">
              <iframe
                title="Flux preview"
                className="h-full w-full"
                src={previewSrc}
                sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Preview updates on transform or live events.</span>
              <span>{liveStatus === "connected" ? "EventSource connected" : "EventSource not available"}</span>
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-3">
          <section className="panel flex min-h-0 flex-col">
            <div className="panel-header">
              <span className="badge">Inspector</span>
              {selectedNode?.textKind ? <span className="text-xs text-slate-500">{selectedNode.textKind}</span> : null}
            </div>
            <div className="panel-body min-h-0 flex-1 overflow-auto">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <div className="text-xs uppercase tracking-widest text-slate-500">Selection</div>
                    <div className="mt-1 text-sm text-slate-100">
                      {selectedOutline?.label ?? selectedNode.label ?? selectedNode.id}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedNode.kind} · {selectedNode.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{propsSummary}</div>
                  </div>
                  {selectedNode.editable ? (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-widest text-slate-500">Text</div>
                      {editText.includes("\n") || editText.length > 120 ? (
                        <textarea
                          className="textarea min-h-[120px]"
                          value={editText}
                          onChange={(event) => {
                            setEditText(event.target.value);
                            setEditDirty(true);
                            setSavedStatus("idle");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              handleCancelEdit();
                            }
                            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                              event.preventDefault();
                              handleApplyText();
                            }
                          }}
                        />
                      ) : (
                        <input
                          className="input"
                          value={editText}
                          onChange={(event) => {
                            setEditText(event.target.value);
                            setEditDirty(true);
                            setSavedStatus("idle");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              handleCancelEdit();
                            }
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleApplyText();
                            }
                          }}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-primary"
                          onClick={handleApplyText}
                          disabled={!editDirty || isApplying}
                        >
                          Apply
                        </button>
                        <button className="btn btn-muted" onClick={handleCancelEdit} disabled={!editDirty || isApplying}>
                          Cancel
                        </button>
                        <span className="text-xs text-slate-500">
                          {editText.includes("\n") || editText.length > 120
                            ? "Ctrl+Enter to apply · Esc to cancel"
                            : "Enter to apply · Esc to cancel"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/40 px-3 py-3 text-xs text-slate-500">
                      This node is read-only in Phase 1. Select a heading or paragraph to edit text.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-400">
                  <p>Select a node in the outline to inspect details.</p>
                  <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
                    Editable fields will appear here for headings and paragraphs.
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="panel flex min-h-0 flex-col">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <span className="badge">Diagnostics</span>
                <span className="text-emerald-300">Pass {diagnosticsSummary.pass}</span>
                <span className="text-amber-300">Warn {diagnosticsSummary.warn}</span>
                <span className="text-rose-300">Fail {diagnosticsSummary.fail}</span>
              </div>
              <button className="btn btn-muted" onClick={() => setDiagnosticsOpen((open) => !open)}>
                {diagnosticsOpen ? "Hide" : "Show"}
              </button>
            </div>
            <div className="panel-body min-h-0 flex-1 overflow-auto">
              {diagnosticsOpen ? (
                diagnosticsItems.length ? (
                  <div className="space-y-3">
                    {diagnosticsItems.map((item, index) => (
                      <button
                        key={`${item.message}-${index}`}
                        type="button"
                        onClick={() => {
                          if (item.nodeId) setSelectedId(item.nodeId);
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          item.level === "fail"
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                            : item.level === "warn"
                              ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest">
                          <span>{item.level}</span>
                          {item.code ? <span className="text-xs text-slate-200">{item.code}</span> : null}
                        </div>
                        <div className="mt-1 text-sm text-slate-100">{item.message}</div>
                        <div className="mt-1 text-xs text-slate-300">
                          {item.file ?? "Unknown file"}
                          {item.range
                            ? ` · ${item.range.start.line}:${item.range.start.column}-${item.range.end.line}:${item.range.end.column}`
                            : item.location
                              ? ` · ${item.location}`
                              : ""}
                        </div>
                        {item.excerpt ? (
                          <pre className="mt-2 rounded-lg bg-slate-950/60 p-2 text-xs text-slate-200">
                            <div>
                              {item.excerpt.line} | {item.excerpt.text}
                            </div>
                            <div>
                              {" ".repeat(String(item.excerpt.line).length)} | {item.excerpt.caret}
                            </div>
                          </pre>
                        ) : null}
                        {item.suggestion ? (
                          <div className="mt-2 text-xs text-slate-300">Suggestion: {item.suggestion}</div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No diagnostics reported for this document.</div>
                )
              ) : (
                <div className="text-sm text-slate-400">Toggle to view diagnostics details.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-xs text-slate-300">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Status</span>
            <span className={statusClass}>{statusLabel}</span>
            {docPath ? <span className="text-slate-500">{truncateMiddle(docPath, 64)}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span>Diagnostics</span>
            <span className="text-emerald-300">Pass {diagnosticsSummary.pass}</span>
            <span className="text-amber-300">Warn {diagnosticsSummary.warn}</span>
            <span className="text-rose-300">Fail {diagnosticsSummary.fail}</span>
          </div>
        </div>
      </footer>

      {toast ? (
        <div className="pointer-events-none fixed bottom-20 right-6 z-40 animate-fade-up">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.kind === "success"
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                : toast.kind === "error"
                  ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                  : "border-slate-700/80 bg-slate-900/80 text-slate-200"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <FigureModal
        open={figureModalOpen}
        onClose={() => setFigureModalOpen(false)}
        value={figureForm}
        onChange={setFigureForm}
        onSubmit={handleSubmitFigure}
      />
    </div>
  );
}

function OutlineTree({
  nodes,
  selectedId,
  onSelect
}: {
  nodes: OutlineNode[];
  selectedId?: string | null;
  onSelect: (node: OutlineNode) => void;
}) {
  if (!nodes.length) {
    return <div className="text-xs text-slate-500">No outline data available.</div>;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <OutlineNodeItem key={node.id} node={node} depth={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function OutlineNodeItem({
  node,
  depth,
  selectedId,
  onSelect
}: {
  node: OutlineNode;
  depth: number;
  selectedId?: string | null;
  onSelect: (node: OutlineNode) => void;
}) {
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition ${
          isSelected ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800/60"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-500">{node.kind}</span>
        <span className="truncate text-sm text-slate-100">{node.label}</span>
      </button>
      {node.children.length ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FigureFields({
  value,
  onChange,
  disabled
}: {
  value: FigureFormState;
  onChange: (next: FigureFormState) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <label className="text-xs uppercase tracking-widest text-slate-500">Bank name</label>
        <input
          className="input mt-1"
          value={value.bankName}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, bankName: event.target.value })}
          placeholder="hero-assets"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-slate-500">Tags</label>
        <input
          className="input mt-1"
          value={value.tags}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, tags: event.target.value })}
          placeholder="cover, poster, alt"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500">Reserve</label>
          <select
            className="select mt-1"
            value={value.reserve}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, reserve: event.target.value })}
          >
            {FIGURE_RESERVES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500">Fit</label>
          <select
            className="select mt-1"
            value={value.fit}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, fit: event.target.value })}
          >
            {FIGURE_FITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-slate-500">Caption</label>
        <textarea
          className="textarea mt-1 min-h-[80px]"
          value={value.caption}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, caption: event.target.value })}
          placeholder="Optional caption text"
        />
      </div>
    </div>
  );
}

function FigureModal({
  open,
  onClose,
  value,
  onChange,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  value: FigureFormState;
  onChange: (next: FigureFormState) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur">
      <div className="panel w-full max-w-lg animate-fade-up">
        <div className="panel-header">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Insert figure</div>
            <div className="text-sm text-slate-200">Configure figure options before inserting.</div>
          </div>
          <button className="btn btn-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="panel-body space-y-4">
          <FigureFields value={value} onChange={onChange} />
          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-muted" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={onSubmit}>
              Insert figure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
