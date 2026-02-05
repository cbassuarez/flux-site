import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Command } from "cmdk";
import MonacoEditor, { loader } from "@monaco-editor/react";
import type { DocumentNode, NodePropValue, RefreshPolicy } from "@flux-lang/core";
import "./editor.css";
import {
  DividerHairline,
  EditorFrame,
  EditorToolbar,
  InspectorPane,
  OutlinePane,
  PageStage,
  StatusBar,
} from "./components/EditorShell";
import { monaco } from "./monaco";
import { createDocService, type AssetItem } from "./docService";
import { buildOutlineFromDoc, extractPlainText, getLiteralString, type OutlineNode } from "./docModel";
import RichTextEditor from "./RichTextEditor";
import {
  buildAddCalloutTransform,
  buildAddFigureTransform,
  buildAddParagraphTransform,
  buildAddSectionTransform,
  buildAddSlotTransform,
  buildAddTableTransform,
} from "./transforms";
import { extractDiagnosticsItems, extractDiagnosticsSummary } from "./diagnostics";
import { matchSorter } from "match-sorter";

loader.config({ monaco });

type Toast = {
  kind: "success" | "error" | "info";
  message: string;
};

type FindItem = {
  id: string;
  text: string;
  breadcrumbs: string[];
  kind: string;
};

export default function EditorApp() {
  const serviceRef = useRef(createDocService());
  const docService = serviceRef.current;
  const docState = useSyncExternalStore(docService.subscribe, docService.getState);
  const doc = docState.doc;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"preview" | "edit" | "source">("preview");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [assetPanelOpen, setAssetPanelOpen] = useState(true);
  const [outlineQuery, setOutlineQuery] = useState("");
  const [debugSlots, setDebugSlots] = useState(false);
  const [sourceDraft, setSourceDraft] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<Toast | null>(null);
  const [draggingAsset, setDraggingAsset] = useState<AssetItem | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 1100,
  );
  const [outlineWidth, setOutlineWidth] = useState(() => getStoredWidth("outline", 300));
  const [inspectorWidth, setInspectorWidth] = useState(() => getStoredWidth("inspector", 320));

  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const richEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const monacoEditorRef = useRef<any>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    void docService.loadDoc();
  }, [docService]);

  useEffect(() => {
    if (!doc?.source) return;
    if (sourceDraft.trim() === "" || sourceDraft === doc.source) {
      setSourceDraft(doc.source);
    }
  }, [doc?.source, sourceDraft]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("flux-editor-outline-width", String(outlineWidth));
  }, [outlineWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("flux-editor-inspector-width", String(inspectorWidth));
  }, [inspectorWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1100) setInspectorVisible(false);
    const handleResize = () => {
      if (window.innerWidth < 1100) setInspectorVisible(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "flux-select" && event.data.nodeId) {
        setSelectedId(String(event.data.nodeId));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "flux-debug", enabled: debugSlots }, "*");
  }, [debugSlots]);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow || !selectedId) return;
    frame.contentWindow.postMessage({ type: "flux-highlight", nodeId: selectedId }, "*");
  }, [selectedId]);

  const handlePreviewLoad = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "flux-debug", enabled: debugSlots }, "*");
    if (selectedId) {
      frame.contentWindow.postMessage({ type: "flux-highlight", nodeId: selectedId }, "*");
    }
  }, [debugSlots, selectedId]);

  useEffect(() => {
    if (!draggingAsset) return;
    const handler = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, [draggingAsset]);

  const outline = useMemo(() => buildOutlineFromDoc(doc?.ast ?? null), [doc?.ast]);

  useEffect(() => {
    if (selectedId || !outline.length) return;
    setSelectedId(outline[0].id);
  }, [outline, selectedId]);

  const selectedEntry = useMemo(() => {
    if (!selectedId || !doc?.index) return null;
    return doc.index.get(selectedId) ?? null;
  }, [doc?.index, selectedId]);

  const selectedNode = selectedEntry?.node ?? null;
  const existingIds = useMemo(() => new Set(doc?.index?.keys() ?? []), [doc?.index]);

  const activeTextEntry = useMemo(() => {
    if (!selectedEntry || !doc?.index) return null;
    let entry: typeof selectedEntry | null = selectedEntry;
    while (entry && entry.node.kind !== "text") {
      entry = entry.parentId ? doc.index.get(entry.parentId) ?? null : null;
    }
    return entry;
  }, [selectedEntry, doc?.index]);

  const activeTextNode = activeTextEntry?.node ?? null;

  const diagnosticsSummary = useMemo(() => extractDiagnosticsSummary(doc?.diagnostics), [doc?.diagnostics]);
  const diagnosticsItems = useMemo(() => extractDiagnosticsItems(doc?.diagnostics), [doc?.diagnostics]);
  const previewSrc = useMemo(() => buildPreviewSrc(doc?.previewPath, doc?.revision), [doc?.previewPath, doc?.revision]);

  const updateMonacoMarkers = useCallback(() => {
    const monacoInstance = monacoRef.current;
    const editor = monacoEditorRef.current;
    if (!monacoInstance || !editor) return;
    const markers = diagnosticsItems
      .filter((item) => item.range)
      .map((item) => ({
        message: item.message,
        severity:
          item.level === "fail" ? monacoInstance.MarkerSeverity.Error : monacoInstance.MarkerSeverity.Warning,
        startLineNumber: item.range?.start.line ?? 1,
        startColumn: item.range?.start.column ?? 1,
        endLineNumber: item.range?.end.line ?? item.range?.start.line ?? 1,
        endColumn: item.range?.end.column ?? item.range?.start.column ?? 1,
      }));
    const model = editor.getModel();
    if (model) monacoInstance.editor.setModelMarkers(model, "flux", markers);
  }, [diagnosticsItems]);

  useEffect(() => {
    updateMonacoMarkers();
  }, [updateMonacoMarkers]);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (node: OutlineNode) => {
      map.set(node.id, node.label);
      node.children.forEach(walk);
    };
    outline.forEach(walk);
    return map;
  }, [outline]);

  const breadcrumbs = useMemo(() => {
    if (!selectedEntry) return [] as string[];
    const pathIds = [...(selectedEntry.path ?? []), selectedEntry.id];
    return pathIds.map((id) => labelMap.get(id) ?? id);
  }, [labelMap, selectedEntry]);

  const breadcrumbLabel = breadcrumbs.length ? breadcrumbs.join(" › ") : "Document";

  const filteredOutline = useMemo(() => filterOutline(outline, outlineQuery), [outline, outlineQuery]);

  const searchItems = useMemo(() => {
    if (!doc?.ast?.body?.nodes) return [] as FindItem[];
    const items: FindItem[] = [];

    const walk = (node: DocumentNode, breadcrumbs: string[]) => {
      const nextBreadcrumbs =
        node.kind === "page" || node.kind === "section" || node.kind === "figure"
          ? [...breadcrumbs, labelMap.get(node.id) ?? node.id]
          : breadcrumbs;

      if (node.kind === "text") {
        const text = extractPlainText(node).trim();
        if (text) {
          items.push({
            id: node.id,
            text,
            breadcrumbs: nextBreadcrumbs,
            kind: node.kind,
          });
        }
      }

      node.children?.forEach((child) => walk(child, nextBreadcrumbs));
    };

    doc.ast.body.nodes.forEach((node) => walk(node, []));
    return items;
  }, [doc?.ast, labelMap]);

  const findResults = useMemo(() => {
    if (!findQuery.trim()) return [] as FindItem[];
    const lower = findQuery.trim().toLowerCase();
    return searchItems.filter((item) => item.text.toLowerCase().includes(lower));
  }, [findQuery, searchItems]);

  const findIndexLookup = useMemo(() => {
    const map = new Map<string, number>();
    findResults.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [findResults]);

  const visibleFindResults = useMemo(() => findResults.slice(0, 8), [findResults]);

  const groupedFindResults = useMemo(() => {
    const groups = new Map<string, FindItem[]>();
    for (const item of visibleFindResults) {
      const label = item.breadcrumbs.slice(0, 2).join(" · ") || "Document";
      const list = groups.get(label);
      if (list) {
        list.push(item);
      } else {
        groups.set(label, [item]);
      }
    }
    return Array.from(groups, ([label, items]) => ({ label, items }));
  }, [visibleFindResults]);

  const activeFindItem = findResults.length ? findResults[Math.min(findIndex, findResults.length - 1)] : null;

  useEffect(() => {
    if (!activeFindItem) return;
    setSelectedId(activeFindItem.id);
  }, [activeFindItem]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (!isTypingTarget && event.key === "]") {
        event.preventDefault();
        setInspectorVisible((prev) => !prev);
      }
      if (event.key === "Escape") {
        setFindOpen(false);
        setPaletteOpen(false);
        setOverflowOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sourceDirty = doc?.source ? sourceDraft !== doc.source : false;

  const handleTransform = useCallback(
    async (transform: { op: string; args: Record<string, unknown> }, successMessage?: string) => {
      setIsApplying(true);
      setSaveStatus("saving");
      const nextState = await docService.applyTransform(transform, { pushHistory: true });
      setIsApplying(false);
      if (nextState.status === "ready") {
        setSaveStatus("saved");
        if (successMessage) setToast({ kind: "success", message: successMessage });
      } else {
        setSaveStatus("error");
        setToast({ kind: "error", message: nextState.error ?? "Transform failed" });
      }
    },
    [docService],
  );

  const debouncedRichTextUpdate = useDebouncedCallback((node: DocumentNode) => {
    void handleTransform({ op: "replaceNode", args: { id: node.id, node } });
  }, 400);

  const handleInlineSlotUpdate = useCallback(
    (payload: { text?: string; reserve?: string; fit?: string; refresh?: RefreshPolicy }) => {
      if (!selectedNode || selectedNode.kind !== "inline_slot") return;
      const props: Record<string, NodePropValue> = { ...(selectedNode.props ?? {}) };
      if (payload.reserve !== undefined) props.reserve = { kind: "LiteralValue", value: payload.reserve };
      if (payload.fit !== undefined) props.fit = { kind: "LiteralValue", value: payload.fit };
      const nextChildren = (selectedNode.children ?? []).map((child) => {
        if (child.kind !== "text") return child;
        const current = getLiteralString(child.props?.content) ?? "";
        const value = payload.text ?? current;
        return {
          ...child,
          props: { ...(child.props ?? {}), content: { kind: "LiteralValue", value } },
        };
      });
      const nextNode: DocumentNode = {
        ...selectedNode,
        props,
        refresh: payload.refresh ?? selectedNode.refresh,
        children: nextChildren,
      };
      void handleTransform({ op: "replaceNode", args: { id: nextNode.id, node: nextNode } });
    },
    [selectedNode, handleTransform],
  );

  const handleInsertSection = useCallback(() => {
    void handleTransform(buildAddSectionTransform(), "Section added");
  }, [handleTransform]);

  const handleInsertTextSection = useCallback(() => {
    void handleTransform(buildAddSectionTransform({ noHeading: true }), "Text section added");
  }, [handleTransform]);

  const handleInsertParagraph = useCallback(() => {
    void handleTransform(buildAddParagraphTransform(), "Paragraph added");
  }, [handleTransform]);

  const handleInsertFigure = useCallback(() => {
    void handleTransform(
      buildAddFigureTransform({ bankName: "", tags: [], caption: "", reserve: "", fit: "scaleDown" }),
      "Figure added",
    );
  }, [handleTransform]);

  const handleInsertCallout = useCallback(() => {
    void handleTransform(buildAddCalloutTransform(), "Callout inserted");
  }, [handleTransform]);

  const handleInsertTable = useCallback(() => {
    void handleTransform(buildAddTableTransform(), "Table inserted");
  }, [handleTransform]);

  const handleInsertSlot = useCallback(() => {
    void handleTransform(buildAddSlotTransform(), "Slot inserted");
  }, [handleTransform]);

  const handleInsertInlineSlot = useCallback(() => {
    const editor = richEditorRef.current;
    if (!editor) return;
    const ids = new Set(existingIds);
    const inlineId = nextId("inlineSlot", ids);
    const textId = nextId("slotText", ids);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "inlineSlot",
        attrs: {
          id: inlineId,
          textId,
          text: "slot",
          reserve: "fixedWidth(9, ch)",
          fit: "ellipsis",
          refresh: "onDocstep",
        },
      })
      .run();
  }, [doc?.index]);

  const handleApplySource = useCallback(async () => {
    if (!sourceDirty) return;
    setIsApplying(true);
    setSaveStatus("saving");
    const nextState = await docService.saveDoc(sourceDraft);
    setIsApplying(false);
    if (nextState.status === "ready") {
      setSaveStatus("saved");
      setToast({ kind: "success", message: "Source applied" });
    } else {
      setSaveStatus("error");
      setToast({ kind: "error", message: nextState.error ?? "Source apply failed" });
    }
  }, [docService, sourceDraft, sourceDirty]);

  const handleExportPdf = useCallback(() => {
    setToast({ kind: "info", message: "PDF export is not available yet." });
  }, []);

  const handleCopyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setToast({ kind: "success", message: "Copied ID to clipboard." });
    } catch {
      setToast({ kind: "error", message: "Unable to copy ID." });
    }
  }, []);

  const startResize = useCallback(
    (side: "left" | "right") => (event: any) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = side === "left" ? outlineWidth : inspectorWidth;
      const min = 240;
      const max = 420;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const next =
          side === "left"
            ? clamp(startWidth + delta, min, max)
            : clamp(startWidth - delta, min, max);
        if (side === "left") {
          setOutlineWidth(next);
        } else {
          setInspectorWidth(next);
        }
      };
      const handleUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [outlineWidth, inspectorWidth],
  );

  const handleAssignAsset = useCallback(
    (asset: AssetItem, targetId: string) => {
      if (!doc?.ast || !doc?.index) return;
      const ids = new Set(doc.index.keys());
      const assignment = buildAssetAssignment(doc.ast, doc.index, targetId, asset, ids);
      if (!assignment) {
        setToast({ kind: "error", message: "Drop a figure or slot target." });
        return;
      }
      void handleTransform({ op: "replaceNode", args: { id: assignment.id, node: assignment.node } }, "Asset applied");
    },
    [doc?.ast, doc?.index, handleTransform],
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      const asset = event.active?.data?.current?.asset as AssetItem | undefined;
      setDraggingAsset(null);
      if (!asset) return;

      const overData = event.over?.data?.current;
      if (overData?.type === "outline-drop" && overData.nodeId) {
        handleAssignAsset(asset, String(overData.nodeId));
        return;
      }

      const nodeId = dropAssetOnPreview(
        previewFrameRef.current,
        previewWrapRef.current,
        pointerRef.current,
        true,
      );
      if (nodeId) {
        handleAssignAsset(asset, nodeId);
      }
    },
    [handleAssignAsset],
  );

  const handleDragStart = useCallback((event: any) => {
    const asset = event.active?.data?.current?.asset as AssetItem | undefined;
    if (asset) setDraggingAsset(asset);
  }, []);

  const commandItems = useMemo(() => {
    const insertItems = [
      { id: "insert-section", label: "Section", action: handleInsertSection },
      { id: "insert-text-section", label: "Text Section", action: handleInsertTextSection },
      { id: "insert-paragraph", label: "Paragraph", action: handleInsertParagraph },
      { id: "insert-figure", label: "Figure", action: handleInsertFigure },
      { id: "insert-callout", label: "Callout", action: handleInsertCallout },
      { id: "insert-table", label: "Table", action: handleInsertTable },
      { id: "insert-slot", label: "Slot", action: handleInsertSlot },
      { id: "insert-inline-slot", label: "Inline Slot", action: handleInsertInlineSlot },
    ];

    const wrapItems = [
      { id: "wrap-bold", label: "Wrap selection in Bold", action: () => richEditorRef.current?.chain().focus().toggleBold().run() },
      { id: "wrap-italic", label: "Wrap selection in Italic", action: () => richEditorRef.current?.chain().focus().toggleItalic().run() },
      { id: "wrap-code", label: "Wrap selection in Code", action: () => richEditorRef.current?.chain().focus().toggleCode().run() },
      { id: "wrap-link", label: "Wrap selection in Link", action: () => richEditorRef.current?.chain().focus().toggleLink?.({ href: "" }).run() },
    ];

    const headingItems = searchItems
      .filter((item) => item.kind === "text" && item.breadcrumbs.length)
      .slice(0, 12)
      .map((item) => ({
        id: `goto-${item.id}`,
        label: `Go to ${item.breadcrumbs[item.breadcrumbs.length - 1]}`,
        action: () => setSelectedId(item.id),
      }));

    const utilityItems = [
      { id: "open-assets", label: "Open Asset Browser", action: () => setAssetPanelOpen(true) },
      { id: "toggle-debug", label: debugSlots ? "Disable Debug Outlines" : "Enable Debug Outlines", action: () => setDebugSlots((prev) => !prev) },
    ];

    return { insertItems, wrapItems, headingItems, utilityItems };
  }, [
    handleInsertSection,
    handleInsertTextSection,
    handleInsertParagraph,
    handleInsertFigure,
    handleInsertCallout,
    handleInsertTable,
    handleInsertSlot,
    handleInsertInlineSlot,
    searchItems,
    debugSlots,
  ]);

  if (docState.status === "loading") {
    return (
      <div className="editor-root">
        <div className="editor-loading-panel">Loading editor state…</div>
      </div>
    );
  }

  if (docState.status === "error") {
    return (
      <div className="editor-root">
        <div className="editor-loading-panel">
          <h2>Unable to load editor</h2>
          <p>{docState.error ?? "Unknown error"}</p>
          <button type="button" className="btn" onClick={() => void docService.loadDoc()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-root">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <EditorFrame>
          <EditorToolbar>
            <div className="toolbar-left">
              <div className="doc-identity">
                <div className="doc-title">{doc?.title ?? "Flux Document"}</div>
                {doc?.docPath ? <div className="doc-path">{doc.docPath}</div> : null}
              </div>
              <div className={`save-state save-${saveStatus} ${sourceDirty ? "is-dirty" : ""}`}>
                <span className="save-dot" />
                <span>{renderSaveStatus(saveStatus, sourceDirty)}</span>
              </div>
            </div>
            <div className="toolbar-center">
              <div className="toolbar-group">
                <button className="btn btn-ghost btn-xs" disabled>
                  Fit Width
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  100%
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  −
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  +
                </button>
              </div>
              <div className="toolbar-separator" />
              <div className="toolbar-group">
                <button className="btn btn-ghost btn-xs" disabled>
                  ◀
                </button>
                <span className="toolbar-page">12 / 42</span>
                <button className="btn btn-ghost btn-xs" disabled>
                  ▶
                </button>
              </div>
              <div className="toolbar-separator" />
              <div className="mode-tabs">
                <button
                  className={`mode-tab ${activeMode === "preview" ? "is-active" : ""}`}
                  onClick={() => setActiveMode("preview")}
                >
                  Preview
                </button>
                <button
                  className={`mode-tab ${activeMode === "edit" ? "is-active" : ""}`}
                  onClick={() => setActiveMode("edit")}
                >
                  Edit Text
                </button>
                <button
                  className={`mode-tab ${activeMode === "source" ? "is-active" : ""}`}
                  onClick={() => setActiveMode("source")}
                >
                  Source
                </button>
              </div>
            </div>
            <div className="toolbar-right">
              <button className="btn btn-ghost" onClick={() => setFindOpen(true)}>
                Find
              </button>
              <button className="btn btn-ghost" onClick={() => setPaletteOpen(true)}>
                Commands
              </button>
              <button className="btn btn-primary" onClick={handleExportPdf}>
                Export PDF
              </button>
              <button className="btn btn-ghost btn-icon" onClick={() => setOverflowOpen(true)}>
                ⋯
              </button>
            </div>
          </EditorToolbar>

          <main className="editor-body">
            <OutlinePane className="editor-pane outline-pane" style={{ width: outlineWidth }}>
              <div className="pane-header">
                <div className="pane-heading">
                  <div className="pane-title">Outline</div>
                  <div className="pane-breadcrumb">{breadcrumbLabel}</div>
                </div>
                <div className="pane-actions">
                  <button className="btn btn-ghost btn-xs" onClick={() => setAssetPanelOpen((open) => !open)}>
                    {assetPanelOpen ? "Hide Assets" : "Assets"}
                  </button>
                </div>
              </div>
              <div className="pane-search">
                <input
                  className="input input-quiet"
                  value={outlineQuery}
                  onChange={(event) => setOutlineQuery(event.target.value)}
                  placeholder="Filter outline…"
                />
              </div>
              <div className="pane-body scroll">
                {filteredOutline.length ? (
                  <OutlineTree nodes={filteredOutline} selectedId={selectedId} onSelect={setSelectedId} />
                ) : (
                  <div className="empty">{outlineQuery ? "No matches." : "No outline data."}</div>
                )}
              </div>
              {assetPanelOpen ? (
                <>
                  <DividerHairline />
                  <div className="pane-header pane-header-sub">
                    <div className="pane-title">Asset Bank</div>
                  </div>
                  <div className="pane-body scroll asset-body">
                    <AssetBrowser assets={doc?.assetsIndex ?? []} />
                  </div>
                </>
              ) : null}
            </OutlinePane>

            <div
              className="pane-resizer"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={startResize("left")}
            />

            <PageStage>
              <div className="page-stage-inner">
                <div className="paper-stack">
                  <div className="preview-wrap" ref={previewWrapRef}>
                    <iframe
                      ref={previewFrameRef}
                      title="Flux preview"
                      src={previewSrc}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
                      onLoad={handlePreviewLoad}
                    />
                  </div>
                </div>
              </div>
            </PageStage>

            {inspectorVisible ? (
              <>
                <div
                  className="pane-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  onPointerDown={startResize("right")}
                />
                <InspectorPane className="editor-pane inspector-pane" style={{ width: inspectorWidth }}>
                  {activeMode === "source" ? (
                    <>
                      <div className="pane-header">
                        <div className="pane-title">Source</div>
                        <div className="pane-actions">
                          <span className={`status-pill ${sourceDirty ? "status-dirty" : "status-saved"}`}>
                            {sourceDirty ? "Unsaved" : "Clean"}
                          </span>
                          <button className="btn btn-ghost btn-xs" onClick={handleApplySource} disabled={!sourceDirty || isApplying}>
                            Apply
                          </button>
                        </div>
                      </div>
                      <div className="pane-body source-body">
                        <MonacoEditor
                          height="100%"
                          language="plaintext"
                          theme="vs-dark"
                          value={sourceDraft}
                          onChange={(value) => setSourceDraft(value ?? "")}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                          }}
                          onMount={(editor, monacoInstance) => {
                            monacoRef.current = monacoInstance;
                            monacoEditorRef.current = editor;
                            updateMonacoMarkers();
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="pane-header">
                        <div className="pane-title">Inspector</div>
                        <div className="pane-actions">
                          <button className="btn btn-ghost btn-xs" onClick={() => setPaletteOpen(true)}>
                            Palette
                          </button>
                        </div>
                      </div>
                      <div className="pane-body scroll">
                        {selectedNode ? (
                          <div className="inspector-content">
                            <div className="inspector-header">
                              <div className="inspector-title">{labelMap.get(selectedNode.id) ?? selectedNode.id}</div>
                              <div className="inspector-meta">
                                <span>{selectedNode.kind}</span>
                                <button type="button" className="id-pill" onClick={() => handleCopyId(selectedNode.id)}>
                                  #{selectedNode.id}
                                </button>
                              </div>
                              <div className="inspector-actions">
                                <button className="btn btn-ghost btn-xs" type="button" disabled>
                                  Duplicate
                                </button>
                                <button className="btn btn-ghost btn-xs" type="button" disabled>
                                  Delete
                                </button>
                              </div>
                            </div>

                            {activeTextNode ? (
                              <div className="inspector-section">
                                <div className="section-title">Content</div>
                                {activeMode === "edit" ? (
                                  <RichTextEditor
                                    node={activeTextNode}
                                    existingIds={existingIds}
                                    onUpdate={debouncedRichTextUpdate}
                                    onInlineSlotSelect={(id) => {
                                      if (id) {
                                        setSelectedId(id);
                                      }
                                    }}
                                    onReady={(editor) => {
                                      richEditorRef.current = editor;
                                    }}
                                    highlightQuery={findOpen ? findQuery : undefined}
                                  />
                                ) : (
                                  <div className="section-hint">Switch to Edit Text to modify content.</div>
                                )}
                              </div>
                            ) : activeMode === "edit" ? (
                              <div className="inspector-section">
                                <div className="section-title">Content</div>
                                <div className="section-hint">Select a text node to edit.</div>
                              </div>
                            ) : null}

                            {selectedNode.kind === "inline_slot" ? (
                              <InlineSlotInspector node={selectedNode} onChange={handleInlineSlotUpdate} />
                            ) : null}

                            {selectedNode.kind === "figure" ? (
                              <div className="inspector-section">
                                <div className="section-title">Figure</div>
                                <div className="section-hint">Drop an asset onto the figure in the preview or outline.</div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="inspector-empty">Select a node to inspect properties.</div>
                        )}
                      </div>
                    </>
                  )}
                </InspectorPane>
              </>
            ) : null}
          </main>

          <StatusBar>
            <div className="status-left">
              <span className={`status-pill status-${saveStatus}`}>{renderSaveStatus(saveStatus, sourceDirty)}</span>
              {doc?.docPath ? <span className="status-path">{doc.docPath}</span> : null}
            </div>
            <div className="status-right">
              <span>Diagnostics</span>
              <span className="diag pass">Pass {diagnosticsSummary.pass}</span>
              <span className="diag warn">Warn {diagnosticsSummary.warn}</span>
              <span className="diag fail">Fail {diagnosticsSummary.fail}</span>
            </div>
          </StatusBar>

          {toast ? <div className={`toast toast-${toast.kind}`}>{toast.message}</div> : null}

          {findOpen ? (
            <div className="modal-layer" aria-hidden={!findOpen}>
              <div className="modal-scrim" onClick={() => setFindOpen(false)} />
              <div className="modal-panel find-panel" role="dialog" aria-modal="true">
                <div className="modal-header">
                  <span className="modal-title">Find in Document</span>
                  <button className="btn btn-ghost btn-icon" onClick={() => setFindOpen(false)}>
                    ✕
                  </button>
                </div>
                <input
                  className="input"
                  autoFocus
                  value={findQuery}
                  onChange={(event) => {
                    setFindQuery(event.target.value);
                    setFindIndex(0);
                  }}
                  placeholder="Search text…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (findResults.length) {
                        setFindIndex((prev) => (prev + 1) % findResults.length);
                      }
                    }
                    if (event.key === "Escape") {
                      setFindOpen(false);
                    }
                  }}
                />
                {findResults.length ? (
                  <div className="find-results">
                    {groupedFindResults.map((group) => (
                      <div key={group.label} className="find-group">
                        <div className="find-group-title">{group.label}</div>
                        {group.items.map((item) => {
                          const idx = findIndexLookup.get(item.id) ?? 0;
                          return (
                            <button
                              key={item.id}
                              className={`find-result ${idx === findIndex ? "is-active" : ""}`}
                              onClick={() => {
                                setFindIndex(idx);
                                setSelectedId(item.id);
                              }}
                            >
                              <div className="find-text">{item.text}</div>
                              <div className="find-breadcrumbs">{item.breadcrumbs.join(" · ")}</div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : findQuery ? (
                  <div className="find-empty">No matches</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {overflowOpen ? (
            <div className="modal-layer" aria-hidden={!overflowOpen}>
              <div className="modal-scrim" onClick={() => setOverflowOpen(false)} />
              <div className="modal-panel overflow-panel" role="dialog" aria-modal="true">
                <div className="modal-header">
                  <span className="modal-title">Display</span>
                  <button className="btn btn-ghost btn-icon" onClick={() => setOverflowOpen(false)}>
                    ✕
                  </button>
                </div>
                <div className="overflow-list">
                  <button
                    className={`overflow-item ${debugSlots ? "is-active" : ""}`}
                    onClick={() => setDebugSlots((prev) => !prev)}
                  >
                    Slot outlines
                    <span>{debugSlots ? "On" : "Off"}</span>
                  </button>
                  <button
                    className={`overflow-item ${inspectorVisible ? "is-active" : ""}`}
                    onClick={() => setInspectorVisible((prev) => !prev)}
                  >
                    Inspector pane
                    <span>{inspectorVisible ? "On" : "Off"}</span>
                  </button>
                  <div className="overflow-item is-disabled" aria-disabled="true">
                    Show IDs
                    <span>Coming soon</span>
                  </div>
                  <div className="overflow-item is-disabled" aria-disabled="true">
                    Patch log
                    <span>Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            insertItems={commandItems.insertItems}
            wrapItems={commandItems.wrapItems}
            headingItems={commandItems.headingItems}
            utilityItems={commandItems.utilityItems}
          />
        </EditorFrame>

        <DragOverlay>
          {draggingAsset ? (
            <div className="asset-card drag-overlay">
              <div className="asset-thumb" style={{ backgroundImage: `url(${assetPreviewUrl(draggingAsset)})` }} />
              <div className="asset-title">{draggingAsset.name}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function OutlineTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: OutlineNode[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (!nodes.length) return <div className="empty">No outline data.</div>;
  return (
    <div className="outline-tree">
      {nodes.map((node) => (
        <OutlineItem key={node.id} node={node} depth={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function OutlineItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: OutlineNode;
  depth: number;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const droppable = useDroppable({
    id: `outline:${node.id}`,
    data: { type: "outline-drop", nodeId: node.id },
    disabled: node.kind !== "figure" && node.kind !== "slot" && node.kind !== "image",
  });
  const isSelected = selectedId === node.id;
  return (
    <div className="outline-item">
      <button
        type="button"
        ref={droppable.setNodeRef}
        className={`outline-btn ${isSelected ? "is-selected" : ""} ${droppable.isOver ? "is-over" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        <span className="outline-kind">{node.kind}</span>
        <span className="outline-label">{node.label}</span>
      </button>
      {node.children.length ? (
        <div className="outline-children">
          {node.children.map((child) => (
            <OutlineItem
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

function AssetBrowser({ assets }: { assets: AssetItem[] }) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");

  const tags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => asset.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    let results = assets;
    if (query.trim()) {
      results = matchSorter(results, query.trim(), { keys: ["name", "path", "kind", "tags", "bankName"] });
    }
    if (activeTags.length) {
      results = results.filter((asset) => activeTags.every((tag) => asset.tags.includes(tag)));
    }
    return results;
  }, [assets, query, activeTags]);

  return (
    <div className="asset-browser">
      <div className="asset-controls">
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets…"
        />
        <div className="asset-view-toggle">
          <button className={`btn btn-ghost ${view === "grid" ? "is-active" : ""}`} onClick={() => setView("grid")}>
            Grid
          </button>
          <button className={`btn btn-ghost ${view === "list" ? "is-active" : ""}`} onClick={() => setView("list")}>
            List
          </button>
        </div>
      </div>
      {tags.length ? (
        <div className="asset-tags">
          {tags.slice(0, 10).map((tag) => (
            <button
              key={tag}
              className={`tag-chip ${activeTags.includes(tag) ? "is-active" : ""}`}
              onClick={() =>
                setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
              }
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
      <div className={`asset-list ${view}`}>
        {filtered.map((asset) => (
          <AssetCard key={asset.id} asset={asset} view={view} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset, view }: { asset: AssetItem; view: "grid" | "list" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
    data: { asset },
  });
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`asset-card ${view} ${isDragging ? "is-dragging" : ""}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="asset-thumb" style={{ backgroundImage: `url(${assetPreviewUrl(asset)})` }} />
      <div className="asset-meta">
        <div className="asset-title">{asset.name}</div>
        <div className="asset-path">{asset.path}</div>
        {asset.bankName ? <div className="asset-bank">{asset.bankName}</div> : null}
      </div>
    </div>
  );
}

function InlineSlotInspector({ node, onChange }: { node: DocumentNode; onChange: (payload: any) => void }) {
  const slotText = node.children?.find((child) => child.kind === "text");
  const [text, setText] = useState(getLiteralString(slotText?.props?.content) ?? "");
  const [reserve, setReserve] = useState(getLiteralString(node.props?.reserve) ?? "fixedWidth(8, ch)");
  const [fit, setFit] = useState(getLiteralString(node.props?.fit) ?? "ellipsis");
  const [refresh, setRefresh] = useState(node.refresh?.kind ?? "onLoad");

  useEffect(() => {
    setText(getLiteralString(slotText?.props?.content) ?? "");
  }, [slotText?.props]);

  useEffect(() => {
    setReserve(getLiteralString(node.props?.reserve) ?? "fixedWidth(8, ch)");
    setFit(getLiteralString(node.props?.fit) ?? "ellipsis");
    setRefresh(node.refresh?.kind ?? "onLoad");
  }, [node.id, node.props, node.refresh]);

  return (
    <div className="inspector-section">
      <div className="section-title">Slot</div>
      <label className="field">
        <span>Content</span>
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => onChange({ text })}
        />
      </label>
      <label className="field">
        <span>Reserve</span>
        <input
          className="input"
          value={reserve}
          onChange={(event) => setReserve(event.target.value)}
          onBlur={() => onChange({ reserve })}
        />
      </label>
      <label className="field">
        <span>Fit</span>
        <select
          className="select"
          value={fit}
          onChange={(event) => {
            setFit(event.target.value);
            onChange({ fit: event.target.value });
          }}
        >
          {"clip,ellipsis,shrink,scaleDown".split(",").map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Refresh</span>
        <select
          className="select"
          value={refresh}
          onChange={(event) => {
            setRefresh(event.target.value);
            onChange({ refresh: parseRefresh(event.target.value) });
          }}
        >
          <option value="onLoad">On load</option>
          <option value="onDocstep">Docstep</option>
          <option value="never">Never</option>
        </select>
      </label>
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  insertItems,
  wrapItems,
  headingItems,
  utilityItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insertItems: { id: string; label: string; action: () => void }[];
  wrapItems: { id: string; label: string; action: () => void }[];
  headingItems: { id: string; label: string; action: () => void }[];
  utilityItems: { id: string; label: string; action: () => void }[];
}) {
  return (
    <Command.Dialog
      className="command-root"
      open={open}
      onOpenChange={onOpenChange}
      overlayClassName="cmdk-overlay"
      contentClassName="command-dialog"
    >
      <Command.Input className="command-input" placeholder="Type a command…" />
      <Command.List className="command-list">
        <Command.Group heading="Insert">
          {insertItems.map((item) => (
            <Command.Item
              key={item.id}
              onSelect={() => {
                item.action();
                onOpenChange(false);
              }}
            >
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Wrap">
          {wrapItems.map((item) => (
            <Command.Item
              key={item.id}
              onSelect={() => {
                item.action();
                onOpenChange(false);
              }}
            >
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>
        {headingItems.length ? (
          <Command.Group heading="Go to">
            {headingItems.map((item) => (
              <Command.Item
                key={item.id}
                onSelect={() => {
                  item.action();
                  onOpenChange(false);
                }}
              >
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        <Command.Group heading="Utilities">
          {utilityItems.map((item) => (
            <Command.Item
              key={item.id}
              onSelect={() => {
                item.action();
                onOpenChange(false);
              }}
            >
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

function renderSaveStatus(status: "idle" | "saving" | "saved" | "error", dirty: boolean) {
  if (status === "saving") return "Saving…";
  if (status === "error") return "Error !";
  if (dirty) return "Unsaved •";
  return "Saved ✓";
}

function assetPreviewUrl(asset: AssetItem) {
  if (asset.id) return `/assets/${encodeURIComponent(asset.id)}`;
  if (asset.path) return `/asset?src=${encodeURIComponent(asset.path)}`;
  return "";
}

function buildPreviewSrc(basePath?: string, revision?: number): string {
  if (typeof window === "undefined") return basePath ?? "/preview";
  const url = new URL(basePath ?? "/preview", window.location.origin);
  const file = getFileParam();
  if (file) url.searchParams.set("file", file);
  if (typeof revision === "number") url.searchParams.set("rev", String(revision));
  return `${url.pathname}${url.search}`;
}

function getFileParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("file");
}

function parseRefresh(value: string): RefreshPolicy | undefined {
  if (value === "onDocstep") return { kind: "onDocstep" };
  if (value === "never") return { kind: "never" };
  return { kind: "onLoad" };
}

function nextId(prefix: string, ids: Set<string>) {
  let n = 1;
  let candidate = `${prefix}${n}`;
  while (ids.has(candidate)) {
    n += 1;
    candidate = `${prefix}${n}`;
  }
  ids.add(candidate);
  return candidate;
}

function buildAssetAssignment(
  doc: any,
  index: Map<string, any>,
  targetId: string,
  asset: AssetItem,
  ids: Set<string>,
): { id: string; node: DocumentNode } | null {
  const start = index.get(targetId);
  if (!start) return null;
  let entry = start;
  while (entry && !["figure", "slot", "image"].includes(entry.node.kind)) {
    entry = entry.parentId ? index.get(entry.parentId) : null;
  }
  if (!entry) return null;

  if (entry.node.kind === "image") {
    const updated: DocumentNode = {
      ...entry.node,
      props: { ...(entry.node.props ?? {}), src: { kind: "LiteralValue", value: asset.path } },
    };
    return { id: entry.node.id, node: updated };
  }

  const slotNode = entry.node.kind === "slot" ? entry.node : findFirstChild(entry.node, "slot");
  if (!slotNode) return null;

  const imageNode = findFirstChild(slotNode, "image");
  if (imageNode) {
    const updated: DocumentNode = {
      ...imageNode,
      props: { ...(imageNode.props ?? {}), src: { kind: "LiteralValue", value: asset.path } },
    };
    return { id: imageNode.id, node: updated };
  }

  const nextImage: DocumentNode = {
    id: nextId("image", ids),
    kind: "image",
    props: { src: { kind: "LiteralValue", value: asset.path } },
    children: [],
  };

  const nextSlot: DocumentNode = {
    ...slotNode,
    children: [nextImage],
  };
  return { id: slotNode.id, node: nextSlot };
}

function findFirstChild(node: DocumentNode, kind: string): DocumentNode | null {
  for (const child of node.children ?? []) {
    if (child.kind === kind) return child;
    const nested = findFirstChild(child, kind);
    if (nested) return nested;
  }
  return null;
}

function dropAssetOnPreview(
  frame: HTMLIFrameElement | null,
  wrap: HTMLDivElement | null,
  point: { x: number; y: number },
  resolveId = false,
): string | boolean {
  if (!frame || !wrap) return false;
  const rect = wrap.getBoundingClientRect();
  if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) return false;
  const frameRect = frame.getBoundingClientRect();
  const relX = point.x - frameRect.left;
  const relY = point.y - frameRect.top;
  const doc = frame.contentWindow?.document;
  if (!doc) return false;
  const target = doc.elementFromPoint(relX, relY) as HTMLElement | null;
  const fluxEl = target?.closest?.("[data-flux-node]") as HTMLElement | null;
  if (!fluxEl) return false;
  const nodeId = fluxEl.getAttribute("data-flux-node");
  if (resolveId) return nodeId ?? false;
  return Boolean(nodeId);
}

function filterOutline(nodes: OutlineNode[], query: string): OutlineNode[] {
  if (!query.trim()) return nodes;
  const lower = query.trim().toLowerCase();
  const matches = (node: OutlineNode) =>
    node.label.toLowerCase().includes(lower) || node.kind.toLowerCase().includes(lower);
  const walk = (node: OutlineNode): OutlineNode | null => {
    const nextChildren = node.children.map(walk).filter(Boolean) as OutlineNode[];
    if (matches(node) || nextChildren.length) {
      return { ...node, children: nextChildren };
    }
    return null;
  };
  return nodes.map(walk).filter(Boolean) as OutlineNode[];
}

function getStoredWidth(key: "outline" | "inspector", fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(`flux-editor-${key}-width`);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
