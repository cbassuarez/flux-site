import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchEditOutline,
  fetchEditState,
  postTransform,
  type EditState
} from "./api";
import { buildAddFigureTransform, buildAddSectionTransform, type AddFigureArgs } from "./transforms";
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

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function deriveFigureFields(node: OutlineNode | null): FigureFormState {
  if (!node) {
    return {
      bankName: "",
      tags: "",
      caption: "",
      reserve: FIGURE_RESERVES[0],
      fit: FIGURE_FITS[0]
    };
  }
  const data = node.data as Record<string, unknown> | undefined;
  const tagsValue = Array.isArray(data?.tags) ? (data?.tags as unknown[]).join(", ") : "";
  return {
    bankName: typeof data?.bankName === "string" ? (data?.bankName as string) : "",
    tags: tagsValue,
    caption: typeof data?.caption === "string" ? (data?.caption as string) : "",
    reserve: typeof data?.reserve === "string" ? (data?.reserve as string) : FIGURE_RESERVES[0],
    fit: typeof data?.fit === "string" ? (data?.fit as string) : FIGURE_FITS[0]
  };
}

function extractDocTitle(state?: EditState | null): string {
  if (!state) return "Untitled document";
  const directTitle = typeof state.title === "string" ? state.title : undefined;
  const doc = (state as any).doc;
  const docTitle = doc && typeof doc === "object" ? doc.title ?? doc.meta?.title : undefined;
  return directTitle ?? docTitle ?? "Untitled document";
}

function extractDocPath(state?: EditState | null): string {
  if (!state) return "";
  const directPath = typeof state.path === "string" ? state.path : undefined;
  const doc = (state as any).doc;
  const docPath = doc && typeof doc === "object" ? doc.path ?? doc.meta?.path : undefined;
  return directPath ?? docPath ?? "";
}

function extractPreviewPath(state?: EditState | null): string {
  if (!state) return "/";
  const previewPath = typeof state.previewPath === "string" ? state.previewPath : undefined;
  return previewPath ?? "/";
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
  if (record.doc || record.diagnostics || record.title || record.path || record.capabilities) {
    return payload as EditState;
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
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);
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
  const [lastAction, setLastAction] = useState<Toast | null>(null);

  const docTitle = useMemo(() => extractDocTitle(state), [state]);
  const docPath = useMemo(() => extractDocPath(state), [state]);
  const previewPath = useMemo(() => extractPreviewPath(state), [state]);
  const previewSrc = useMemo(() => withCacheBuster(previewPath, previewNonce), [previewPath, previewNonce]);
  const inspectorFigure = useMemo(() => deriveFigureFields(selectedNode), [selectedNode]);

  const diagnosticsSummary = useMemo(() => extractDiagnosticsSummary(state?.diagnostics), [state]);
  const diagnosticsItems = useMemo<DiagnosticItem[]>(() => extractDiagnosticsItems(state?.diagnostics), [state]);

  const outlineNodes = useMemo(() => {
    if (outline.length) return outline;
    return buildFallbackOutline(state);
  }, [outline, state]);

  const refreshPreview = useCallback(() => {
    setPreviewNonce(Date.now());
  }, []);
  const noop = useCallback(() => undefined, []);

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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!lastAction) return;
    const timer = window.setTimeout(() => setLastAction(null), 7000);
    return () => window.clearTimeout(timer);
  }, [lastAction]);

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
        const nextState = pickStateFromResponse(payload) ?? (await loadState());
        setState(nextState);
        if ((payload as any)?.outline) {
          setOutline(normalizeOutline((payload as any).outline));
        }
        await loadOutline(nextState);
        setSavedStatus("saved");
        setToast({ kind: "success", message: successMessage });
        setLastAction({ kind: "success", message: successMessage });
        if (liveStatus !== "connected") {
          refreshPreview();
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Transform failed";
        setSavedStatus("error");
        setToast({ kind: "error", message });
        setLastAction({ kind: "error", message });
      } finally {
        setIsApplying(false);
      }
    },
    [loadOutline, loadState, liveStatus, refreshPreview]
  );

  const handleAddSection = useCallback(() => {
    return handleTransform(buildAddSectionTransform(), "Section added");
  }, [handleTransform]);

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
  const canAddFigure = canUseCapability(state, "addFigure");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-200">
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
      <div className="flex min-h-screen items-center justify-center px-4 text-slate-200">
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
    <div className="flex min-h-screen flex-col text-slate-100">
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
            <button className="btn btn-primary" onClick={openFigureModal} disabled={!canAddFigure || isApplying}>
              Add Figure
            </button>
            <button className="btn btn-muted" disabled>
              Add Table
            </button>
            <button className="btn btn-muted" disabled>
              Add Callout
            </button>
            <button className="btn btn-muted" disabled>
              Add Slot
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
              selectedId={selectedNode?.id}
              onSelect={(node) => setSelectedNode(node)}
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

        <section className="panel flex min-h-0 flex-col">
          <div className="panel-header">
            <span className="badge">Inspector</span>
            <span className="text-xs text-slate-500">Phase 0</span>
          </div>
          <div className="panel-body min-h-0 flex-1 overflow-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Selection</div>
                  <div className="mt-1 text-sm text-slate-100">{selectedNode.title}</div>
                  <div className="text-xs text-slate-400">
                    {selectedNode.type} · {selectedNode.id}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Figure Options</div>
                  <FigureFields
                    value={inspectorFigure}
                    onChange={noop}
                    disabled
                  />
                  {!selectedNode.type.toLowerCase().includes("figure") ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Select a figure to edit options. Editing will be enabled in Phase 1.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-400">
                <p>Select a node in the outline to inspect details.</p>
                <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
                  Placeholder fields will appear here for future editing.
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-xs text-slate-300">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Status</span>
            <span className={savedStatus === "saved" ? "text-emerald-300" : "text-slate-300"}>
              {savedStatus === "saving"
                ? "Saving..."
                : savedStatus === "saved"
                  ? "Saved ✓"
                  : savedStatus === "error"
                    ? "Save failed"
                    : "Ready"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Diagnostics</span>
              <span className="text-emerald-300">Pass {diagnosticsSummary.pass}</span>
              <span className="text-amber-300">Warn {diagnosticsSummary.warn}</span>
              <span className="text-rose-300">Fail {diagnosticsSummary.fail}</span>
              <button className="btn btn-muted" onClick={() => setDiagnosticsOpen(true)}>
                Show details
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Last action</span>
              <span
                className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-widest ${
                  lastAction?.kind === "success"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : lastAction?.kind === "error"
                      ? "bg-rose-500/20 text-rose-200"
                      : "bg-slate-800/60 text-slate-300"
                }`}
              >
                {lastAction?.message ?? "Awaiting transform"}
              </span>
            </div>
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

      <DiagnosticsDrawer
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        summary={diagnosticsSummary}
        items={diagnosticsItems}
      />

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
        <span className="text-[10px] uppercase tracking-widest text-slate-500">{node.type}</span>
        <span className="truncate text-sm text-slate-100">{node.title}</span>
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

function DiagnosticsDrawer({
  open,
  onClose,
  summary,
  items
}: {
  open: boolean;
  onClose: () => void;
  summary: { pass: number; warn: number; fail: number };
  items: DiagnosticItem[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 py-8 backdrop-blur">
      <div className="panel w-full max-w-3xl animate-fade-up">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <span className="badge">Diagnostics</span>
            <span className="text-emerald-300">Pass {summary.pass}</span>
            <span className="text-amber-300">Warn {summary.warn}</span>
            <span className="text-rose-300">Fail {summary.fail}</span>
          </div>
          <button className="btn btn-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="panel-body max-h-[60vh] overflow-auto">
          {items.length ? (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.message}-${index}`}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    item.level === "fail"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                      : item.level === "warn"
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest">{item.level}</span>
                    {item.code ? <span className="text-xs text-slate-200">{item.code}</span> : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-100">{item.message}</div>
                  {item.location ? <div className="mt-1 text-xs text-slate-300">{item.location}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">No diagnostics reported for this document.</div>
          )}
        </div>
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
