import {
  Component,
  type ReactNode,
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
import type { JSONContent } from "@tiptap/core";
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
import { createDocService, type AssetItem, type DocIndexEntry, type EditorTransform } from "./docService";
import { buildOutlineFromDoc, extractPlainText, getLiteralString, getLiteralValue, type OutlineNode } from "./docModel";
import RichTextEditor from "./RichTextEditor";
import type { TransformRequest } from "./api";
import {
  applyImageFrame,
  ensureFluxAttributes,
  ensurePreviewStyle,
  findFluxElement,
  patchSlotText,
  sanitizeSlotText,
  setPreviewRootClass,
  type ImageFrame,
} from "./previewDom";
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
  const selectedId = docState.selection.id;
  const [activeMode, setActiveMode] = useState<"preview" | "edit" | "source">("preview");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [assetPanelOpen, setAssetPanelOpen] = useState(true);
  const [outlineQuery, setOutlineQuery] = useState("");
  const [debugSlots, setDebugSlots] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<Toast | null>(null);
  const [draggingAsset, setDraggingAsset] = useState<AssetItem | null>(null);
  const [draggingOutlineId, setDraggingOutlineId] = useState<string | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 1100,
  );
  const [outlineWidth, setOutlineWidth] = useState(() => getStoredWidth("outline", 300));
  const [inspectorWidth, setInspectorWidth] = useState(() => getStoredWidth("inspector", 320));
  const [transformError, setTransformError] = useState<string | null>(null);
  const [adjustImageMode, setAdjustImageMode] = useState(false);
  const [frameDraft, setFrameDraft] = useState<ImageFrame | null>(null);
  const [focusedPane, setFocusedPane] = useState("none");
  const [debugEnabled] = useState(() => isDebugEnabled());

  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const richEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const monacoEditorRef = useRef<any>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const previewSelectedRef = useRef<HTMLElement | null>(null);
  const previewHoveredRef = useRef<HTMLElement | null>(null);
  const frameTargetRef = useRef<HTMLElement | null>(null);
  const frameDraftRef = useRef<ImageFrame | null>(null);
  const frameDragRef = useRef<{ startX: number; startY: number; frame: ImageFrame } | null>(null);
  const previewCleanupRef = useRef<(() => void) | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const selectNode = useCallback(
    (id: string | null) => {
      if (!id) {
        docService.setSelection(null);
        return;
      }
      const kind = doc?.index?.get(id)?.node.kind ?? null;
      docService.setSelection(id, kind);
    },
    [doc?.index, docService],
  );

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
    if (!debugEnabled) return;
    const root = editorRootRef.current;
    if (!root) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const topmost = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      if (!topmost) return;
      const style = window.getComputedStyle(topmost);
      console.info("[editor-hit-test]", {
        target: target ? `${target.tagName.toLowerCase()}#${target.id || ""}.${target.className || ""}` : "none",
        topmost: `${topmost.tagName.toLowerCase()}#${topmost.id || ""}.${topmost.className || ""}`,
        pointerEvents: style.pointerEvents,
      });
    };
    root.addEventListener("click", handleClick, true);
    return () => root.removeEventListener("click", handleClick, true);
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return;
    const handleFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) {
        setFocusedPane("none");
        return;
      }
      if (active.closest(".inspector-pane")) {
        setFocusedPane("inspector");
      } else if (active.closest(".outline-pane")) {
        setFocusedPane("outline");
      } else if (active.closest(".page-stage")) {
        setFocusedPane("preview");
      } else if (active.closest(".rich-text-editor") || active.closest(".text-fallback-editor")) {
        setFocusedPane("editor");
      } else {
        setFocusedPane("other");
      }
    };
    window.addEventListener("focusin", handleFocus);
    handleFocus();
    return () => window.removeEventListener("focusin", handleFocus);
  }, [debugEnabled]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "flux-select" && event.data.nodeId) {
        selectNode(String(event.data.nodeId));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [selectNode]);

  useEffect(() => {
    return () => {
      if (previewCleanupRef.current) {
        previewCleanupRef.current();
        previewCleanupRef.current = null;
      }
    };
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


  const outline = useMemo(() => buildOutlineFromDoc(doc?.ast ?? null), [doc?.ast]);

  useEffect(() => {
    if (selectedId || !outline.length) return;
    selectNode(outline[0].id);
  }, [outline, selectedId, selectNode]);

  const selectedEntry = useMemo(() => {
    if (!selectedId || !doc?.index) return null;
    return doc.index.get(selectedId) ?? null;
  }, [doc?.index, selectedId]);

  const selectedNode = selectedEntry?.node ?? null;
  const existingIds = useMemo(() => new Set(doc?.index?.keys() ?? []), [doc?.index]);
  const frameEntry = useMemo(() => resolveFrameEntry(selectedEntry, doc?.index), [doc?.index, selectedEntry]);
  const activeTextEntry = useMemo(() => {
    if (!selectedEntry || !doc?.index) return null;
    if (isSlotContext(selectedEntry, doc.index)) return null;
    if (selectedEntry.node.kind === "text") return selectedEntry;

    const descendant = findFirstChild(selectedEntry.node, "text");
    if (descendant) {
      return doc.index.get(descendant.id) ?? null;
    }

    let entry: typeof selectedEntry | null = selectedEntry;
    while (entry && entry.node.kind !== "text") {
      entry = entry.parentId ? doc.index.get(entry.parentId) ?? null : null;
    }
    return entry;
  }, [selectedEntry, doc?.index]);

  const activeTextNode = activeTextEntry?.node ?? null;
  const captionTarget = useMemo(() => {
    if (!selectedNode || selectedNode.kind !== "figure") return null;
    return resolveCaptionTarget(selectedNode);
  }, [selectedNode]);

  useEffect(() => {
    if (activeMode !== "edit") return;
    if (!activeTextNode) return;
    const editor = richEditorRef.current;
    if (!editor?.commands?.focus) return;
    const timer = window.setTimeout(() => {
      editor.commands.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeMode, activeTextNode?.id]);

  useEffect(() => {
    if (!frameEntry) {
      setFrameDraft(null);
      frameDraftRef.current = null;
      return;
    }
    const next = readImageFrame(frameEntry.node);
    setFrameDraft(next);
    frameDraftRef.current = next;
  }, [frameEntry?.id, frameEntry?.node]);

  useEffect(() => {
    if (!frameEntry) {
      setAdjustImageMode(false);
    }
  }, [frameEntry]);

  const diagnosticsSummary = useMemo(() => extractDiagnosticsSummary(doc?.diagnostics), [doc?.diagnostics]);
  const diagnosticsItems = useMemo(() => extractDiagnosticsItems(doc?.diagnostics), [doc?.diagnostics]);
  const previewSrc = useMemo(() => buildPreviewSrc(doc?.previewPath, doc?.revision), [doc?.previewPath, doc?.revision]);

  const syncPreviewOverlays = useCallback(() => {
    const frame = previewFrameRef.current;
    const frameDoc = frame?.contentDocument;
    if (!frameDoc) return;
    ensurePreviewStyle(frameDoc);
    setPreviewRootClass(frameDoc, "flux-editor-show-ids", showIds);
    setPreviewRootClass(frameDoc, "flux-editor-adjust-image", adjustImageMode);

    const nextSelected = selectedId ? findFluxElement(frameDoc, selectedId) : null;
    if (previewSelectedRef.current && previewSelectedRef.current !== nextSelected) {
      previewSelectedRef.current.removeAttribute("data-flux-selected");
    }
    if (nextSelected && selectedId) {
      const kind = selectedEntry?.node.kind ?? doc?.index?.get(selectedId)?.node.kind;
      ensureFluxAttributes(nextSelected, selectedId, kind);
      nextSelected.setAttribute("data-flux-selected", "true");
    }
    previewSelectedRef.current = nextSelected;

    const nextHovered = hoveredId ? findFluxElement(frameDoc, hoveredId) : null;
    if (previewHoveredRef.current && previewHoveredRef.current !== nextHovered) {
      previewHoveredRef.current.removeAttribute("data-flux-hovered");
    }
    if (nextHovered && hoveredId) {
      const kind = doc?.index?.get(hoveredId)?.node.kind;
      ensureFluxAttributes(nextHovered, hoveredId, kind);
      nextHovered.setAttribute("data-flux-hovered", "true");
    }
    previewHoveredRef.current = nextHovered;
  }, [adjustImageMode, doc?.index, hoveredId, selectedEntry?.node.kind, selectedId, showIds]);

  const syncSlotLabels = useCallback(() => {
    if (!showIds || !doc?.index) return;
    const frameDoc = previewFrameRef.current?.contentDocument;
    if (!frameDoc) return;
    for (const entry of doc.index.values()) {
      if (entry.node.kind !== "slot" && entry.node.kind !== "inline_slot") continue;
      const el = findFluxElement(frameDoc, entry.id);
      if (!el) continue;
      ensureFluxAttributes(el, entry.id, entry.node.kind);
      el.setAttribute("data-flux-slot", "true");
    }
  }, [doc?.index, showIds]);

  const normalizeTextSlots = useCallback(() => {
    if (!doc?.index) return;
    const frameDoc = previewFrameRef.current?.contentDocument;
    if (!frameDoc) return;
    for (const entry of doc.index.values()) {
      if (entry.node.kind !== "inline_slot" && entry.node.kind !== "slot") continue;
      if (entry.node.kind === "slot" && findFirstChild(entry.node, "image")) continue;
      const resolved = resolveSlotDisplayText(entry.node, docState.runtime, doc?.assetsIndex ?? []);
      const text = sanitizeSlotText(resolved ?? "");
      const slotEl = findFluxElement(frameDoc, entry.id);
      if (!slotEl) continue;
      ensureFluxAttributes(slotEl, entry.id, entry.node.kind);
      patchSlotText(slotEl, text, entry.node.kind === "inline_slot");
    }
  }, [doc?.assetsIndex, doc?.index, docState.runtime]);

  const applyFrameToPreview = useCallback(
    (frame: ImageFrame) => {
      const frameDoc = previewFrameRef.current?.contentDocument;
      if (!frameDoc || !frameEntry) return;
      const targetEl =
        findFluxElement(frameDoc, frameEntry.id) ??
        (selectedId ? findFluxElement(frameDoc, selectedId) : null);
      if (!targetEl) return;
      const img = targetEl.tagName === "IMG" ? targetEl : targetEl.querySelector("img");
      if (!img) return;
      if (frameTargetRef.current && frameTargetRef.current !== img) {
        frameTargetRef.current.removeAttribute("data-flux-frame-target");
      }
      frameTargetRef.current = img as HTMLElement;
      applyImageFrame(img as HTMLElement, frame);
    },
    [frameEntry, selectedId],
  );

  const attachPreviewListeners = useCallback(() => {
    const frame = previewFrameRef.current;
    const frameDoc = frame?.contentDocument;
    if (!frameDoc) return () => undefined;
    ensurePreviewStyle(frameDoc);

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const fluxEl = target?.closest?.("[data-flux-id], [data-flux-node]") as HTMLElement | null;
      if (!fluxEl) return;
      const nodeId = fluxEl.getAttribute("data-flux-id") ?? fluxEl.getAttribute("data-flux-node");
      if (nodeId) selectNode(String(nodeId));
    };

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const fluxEl = target?.closest?.("[data-flux-id], [data-flux-node]") as HTMLElement | null;
      const nodeId = fluxEl?.getAttribute("data-flux-id") ?? fluxEl?.getAttribute("data-flux-node");
      setHoveredId((prev) => (prev === nodeId ? prev : nodeId ?? null));
    };

    const handlePointerLeave = () => {
      setHoveredId(null);
    };

    frameDoc.addEventListener("click", handleClick, true);
    frameDoc.addEventListener("pointermove", handlePointerMove);
    frameDoc.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      frameDoc.removeEventListener("click", handleClick, true);
      frameDoc.removeEventListener("pointermove", handlePointerMove);
      frameDoc.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const handlePreviewLoad = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "flux-debug", enabled: debugSlots }, "*");
    if (selectedId) {
      frame.contentWindow.postMessage({ type: "flux-highlight", nodeId: selectedId }, "*");
    }
    if (previewCleanupRef.current) {
      previewCleanupRef.current();
      previewCleanupRef.current = null;
    }
    previewCleanupRef.current = attachPreviewListeners();
    syncPreviewOverlays();
    syncSlotLabels();
    normalizeTextSlots();
  }, [attachPreviewListeners, debugSlots, normalizeTextSlots, selectedId, syncPreviewOverlays, syncSlotLabels]);

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
    selectNode(activeFindItem.id);
  }, [activeFindItem, selectNode]);

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
    async (transform: EditorTransform | TransformRequest, successMessage?: string) => {
      setSaveStatus("saving");
      const result = await docService.applyTransform(transform, { pushHistory: true });
      if (result.ok) {
        setSaveStatus("saved");
        setTransformError(null);
        if (successMessage) setToast({ kind: "success", message: successMessage });
      } else {
        setSaveStatus("error");
        const message = result.error ?? "Transform failed";
        setTransformError(message);
        setToast({ kind: "error", message });
      }
    },
    [docService],
  );

  const applyTextContent = useCallback(
    (id: string, payload: { text?: string; richText?: JSONContent }) => {
      void handleTransform({ type: "setTextNodeContent", id, ...payload });
    },
    [handleTransform],
  );

  const debouncedRichTextUpdate = useDebouncedCallback((id: string, richText: JSONContent) => {
    applyTextContent(id, { richText });
  }, 400);

  const debouncedPlainTextUpdate = useDebouncedCallback((id: string, text: string) => {
    applyTextContent(id, { text });
  }, 240);

  const commitPlainTextUpdate = useCallback(
    (id: string, text: string) => {
      applyTextContent(id, { text });
    },
    [applyTextContent],
  );

  const applySlotGenerator = useCallback(
    (slotId: string, spec: SlotGeneratorSpec) => {
      const expr = buildGeneratorExpr(spec);
      const generator = expr ? wrapExpressionValue(expr) : (spec as unknown as Record<string, unknown>);
      void handleTransform({ type: "setSlotGenerator", id: slotId, generator });
    },
    [handleTransform],
  );

  const commitFrame = useCallback(
    (frame: ImageFrame) => {
      if (!frameEntry) return;
      const nextNode = updateImageFrameNode(frameEntry.node, frame);
      void handleTransform({ op: "replaceNode", args: { id: frameEntry.id, node: nextNode } });
    },
    [frameEntry, handleTransform],
  );

  const debouncedCommitFrame = useDebouncedCallback((frame: ImageFrame) => {
    commitFrame(frame);
  }, 240);

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
  }, [existingIds]);

  const handleApplySource = useCallback(async () => {
    if (!sourceDirty) return;
    setSaveStatus("saving");
    const result = await docService.applyTransform({ type: "setSource", source: sourceDraft }, { pushHistory: false });
    if (result.ok) {
      setSaveStatus("saved");
      setToast({ kind: "success", message: "Source applied" });
    } else {
      setSaveStatus("error");
      setToast({ kind: "error", message: result.error ?? "Source apply failed" });
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

  const handleOutlineReorder = useCallback(
    (event: any) => {
      if (!doc?.index) return;
      const activeId = event.active?.data?.current?.nodeId as string | undefined;
      const overId = event.over?.data?.current?.nodeId as string | undefined;
      if (!activeId || !overId || activeId === overId) return;
      const activeEntry = doc.index.get(activeId);
      const overEntry = doc.index.get(overId);
      if (!activeEntry || !overEntry) return;
      if (!activeEntry.parentId || activeEntry.parentId !== overEntry.parentId) return;
      const parentEntry = doc.index.get(activeEntry.parentId);
      if (!parentEntry || parentEntry.node.kind !== "section") return;
      const nextParent = reorderChildren(parentEntry.node, activeId, overId);
      if (!nextParent) return;
      void handleTransform({ op: "replaceNode", args: { id: parentEntry.id, node: nextParent } });
      selectNode(activeId);
    },
    [doc?.index, handleTransform, selectNode],
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      const dragType = event.active?.data?.current?.type as string | undefined;
      setDraggingAsset(null);
      setDraggingOutlineId(null);

      if (dragType === "outline") {
        handleOutlineReorder(event);
        return;
      }

      const asset = event.active?.data?.current?.asset as AssetItem | undefined;
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
    [handleAssignAsset, handleOutlineReorder],
  );

  const handleDragStart = useCallback((event: any) => {
    const dragType = event.active?.data?.current?.type as string | undefined;
    if (dragType === "outline") {
      const nodeId = event.active?.data?.current?.nodeId as string | undefined;
      if (nodeId) setDraggingOutlineId(String(nodeId));
      return;
    }
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
        action: () => selectNode(item.id),
      }));

    const utilityItems = [
      { id: "open-assets", label: "Open Asset Browser", action: () => setAssetPanelOpen(true) },
      { id: "toggle-show-ids", label: showIds ? "Hide IDs" : "Show IDs", action: () => setShowIds((prev) => !prev) },
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
    showIds,
    debugSlots,
    selectNode,
  ]);

  useEffect(() => {
    if (!draggingAsset) return;
    const handler = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, [draggingAsset]);

  useEffect(() => {
    if (!showIds) setHoveredId(null);
  }, [showIds]);

  useEffect(() => {
    syncPreviewOverlays();
  }, [syncPreviewOverlays]);

  useEffect(() => {
    syncSlotLabels();
    normalizeTextSlots();
  }, [normalizeTextSlots, syncSlotLabels, previewSrc]);

  useEffect(() => {
    if (frameDraft && frameEntry) {
      applyFrameToPreview(frameDraft);
    }
  }, [applyFrameToPreview, frameDraft, frameEntry]);

  useEffect(() => {
    if (!adjustImageMode || !frameEntry) return;
    const frameDoc = previewFrameRef.current?.contentDocument;
    if (!frameDoc) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const frameTarget = frameTargetRef.current;
      if (!frameTarget || !target || !frameTarget.contains(target)) return;
      event.preventDefault();
      const base = frameDraftRef.current ?? readImageFrame(frameEntry.node);
      frameDragRef.current = { startX: event.clientX, startY: event.clientY, frame: base };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const drag = frameDragRef.current;
        if (!drag) return;
        const dx = moveEvent.clientX - drag.startX;
        const dy = moveEvent.clientY - drag.startY;
        let next = { ...drag.frame };
        if (moveEvent.shiftKey) {
          next.scale = clamp(drag.frame.scale + -dy * 0.005, 0.5, 2.5);
        } else {
          next.offsetX = drag.frame.offsetX + dx;
          next.offsetY = drag.frame.offsetY + dy;
        }
        frameDraftRef.current = next;
        applyFrameToPreview(next);
      };

      const handlePointerUp = () => {
        const finalFrame = frameDraftRef.current;
        if (finalFrame) {
          setFrameDraft(finalFrame);
          commitFrame(finalFrame);
        }
        frameDragRef.current = null;
        frameDoc.removeEventListener("pointermove", handlePointerMove);
        frameDoc.removeEventListener("pointerup", handlePointerUp);
      };

      frameDoc.addEventListener("pointermove", handlePointerMove);
      frameDoc.addEventListener("pointerup", handlePointerUp);
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as Node | null;
      const frameTarget = frameTargetRef.current;
      if (!frameTarget || !target || !frameTarget.contains(target)) return;
      event.preventDefault();
      const base = frameDraftRef.current ?? readImageFrame(frameEntry.node);
      const next = {
        ...base,
        scale: clamp(base.scale + -event.deltaY * 0.0015, 0.5, 2.5),
      };
      frameDraftRef.current = next;
      setFrameDraft(next);
      applyFrameToPreview(next);
      debouncedCommitFrame(next);
    };

    frameDoc.addEventListener("pointerdown", handlePointerDown);
    frameDoc.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      frameDoc.removeEventListener("pointerdown", handlePointerDown);
      frameDoc.removeEventListener("wheel", handleWheel);
    };
  }, [adjustImageMode, applyFrameToPreview, commitFrame, debouncedCommitFrame, frameEntry]);

  useEffect(() => {
    if (!adjustImageMode || !frameEntry) return;
    const handleKey = (event: KeyboardEvent) => {
      if (!frameDraftRef.current) return;
      const delta = event.shiftKey ? 10 : 1;
      let next = { ...frameDraftRef.current };
      let changed = false;
      if (event.key === "ArrowLeft") {
        next.offsetX -= delta;
        changed = true;
      }
      if (event.key === "ArrowRight") {
        next.offsetX += delta;
        changed = true;
      }
      if (event.key === "ArrowUp") {
        next.offsetY -= delta;
        changed = true;
      }
      if (event.key === "ArrowDown") {
        next.offsetY += delta;
        changed = true;
      }
      if (!changed) return;
      event.preventDefault();
      frameDraftRef.current = next;
      setFrameDraft(next);
      applyFrameToPreview(next);
      debouncedCommitFrame(next);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [adjustImageMode, applyFrameToPreview, debouncedCommitFrame, frameEntry]);

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
    <div className="editor-root" ref={editorRootRef}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraggingAsset(null);
          setDraggingOutlineId(null);
        }}
      >
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
              {debugEnabled ? (
                <div className="debug-line">
                  <span>doc: {docState.status}</span>
                  <span>busy: {docState.isApplying ? "true" : "false"}</span>
                  <span>overlay: {paletteOpen || findOpen || overflowOpen ? "true" : "false"}</span>
                  <span>focus: {focusedPane}</span>
                  <span>selected: {selectedId ?? "none"}</span>
                </div>
              ) : null}
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
              <button className={`btn btn-ghost ${showIds ? "is-active" : ""}`} onClick={() => setShowIds((prev) => !prev)}>
                Show IDs
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
                  <OutlineTree
                    nodes={filteredOutline}
                    selectedId={selectedId}
                    draggingAsset={draggingAsset}
                    draggingOutlineId={draggingOutlineId}
                    onSelect={selectNode}
                  />
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
                          <button className="btn btn-ghost btn-xs" onClick={handleApplySource} disabled={!sourceDirty || docState.isApplying}>
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
                            {transformError ? <div className="inspector-alert">{transformError}</div> : null}

                            {activeTextNode ? (
                              <div className="inspector-section">
                                <div className="section-title">Content</div>
                                {activeMode === "edit" ? (
                                  <TextContentEditor
                                    node={activeTextNode}
                                    onRichTextUpdate={(json) => debouncedRichTextUpdate(activeTextNode.id, json)}
                                    onPlainTextUpdate={(text) => debouncedPlainTextUpdate(activeTextNode.id, text)}
                                    onPlainTextCommit={(text) => commitPlainTextUpdate(activeTextNode.id, text)}
                                    onInlineSlotSelect={(id) => {
                                      if (id) {
                                        selectNode(id);
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

                            {selectedNode.kind === "inline_slot" || selectedNode.kind === "slot" ? (
                              <SlotInspector
                                node={selectedNode}
                                assets={doc?.assetsIndex ?? []}
                                runtime={docState.runtime}
                                onRuntimeChange={(inputs) => docService.setRuntimeInputs(inputs)}
                                onLiteralChange={(textId, text) => applyTextContent(textId, { text })}
                                onGeneratorChange={(spec) => applySlotGenerator(selectedNode.id, spec)}
                                onPropsChange={(payload) => handleTransform({ type: "setSlotProps", id: selectedNode.id, ...payload })}
                              />
                            ) : null}

                            {captionTarget ? (
                              <CaptionInspector
                                label="Caption"
                                value={captionTarget.value}
                                onCommit={(value) => {
                                  if (captionTarget.kind === "prop") {
                                    handleTransform({
                                      type: "setNodeProps",
                                      id: captionTarget.id,
                                      props: { caption: { kind: "LiteralValue", value } },
                                    });
                                    return;
                                  }
                                  applyTextContent(captionTarget.id, { text: value });
                                }}
                              />
                            ) : null}

                            {frameEntry && frameDraft ? (
                              <ImageFrameInspector
                                frame={frameDraft}
                                adjustMode={adjustImageMode}
                                onToggleAdjust={() => setAdjustImageMode((prev) => !prev)}
                                onChange={(next) => {
                                  setFrameDraft(next);
                                  frameDraftRef.current = next;
                                  applyFrameToPreview(next);
                                  debouncedCommitFrame(next);
                                }}
                                onCommit={(next) => {
                                  setFrameDraft(next);
                                  frameDraftRef.current = next;
                                  applyFrameToPreview(next);
                                  commitFrame(next);
                                }}
                                onReset={() => {
                                  const next = defaultImageFrame();
                                  setFrameDraft(next);
                                  frameDraftRef.current = next;
                                  applyFrameToPreview(next);
                                  commitFrame(next);
                                }}
                              />
                            ) : selectedNode.kind === "figure" ? (
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
                                selectNode(item.id);
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
                  <button
                    className={`overflow-item ${showIds ? "is-active" : ""}`}
                    onClick={() => setShowIds((prev) => !prev)}
                  >
                    Show IDs
                    <span>{showIds ? "On" : "Off"}</span>
                  </button>
                  <div className="overflow-item is-disabled" aria-disabled="true">
                    Patch log
                    <span>Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {paletteOpen ? (
            <CommandPalette
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              insertItems={commandItems.insertItems}
              wrapItems={commandItems.wrapItems}
              headingItems={commandItems.headingItems}
              utilityItems={commandItems.utilityItems}
            />
          ) : null}
        </EditorFrame>

        <DragOverlay>
          {draggingAsset ? (
            <div className="asset-card drag-overlay">
              <div className="asset-thumb" style={{ backgroundImage: `url(${assetPreviewUrl(draggingAsset)})` }} />
              <div className="asset-title">{draggingAsset.name}</div>
            </div>
          ) : draggingOutlineId ? (
            <div className="outline-drag-overlay">
              Moving {labelMap.get(draggingOutlineId) ?? draggingOutlineId}
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
  draggingAsset,
  draggingOutlineId,
  onSelect,
}: {
  nodes: OutlineNode[];
  selectedId?: string | null;
  draggingAsset?: AssetItem | null;
  draggingOutlineId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (!nodes.length) return <div className="empty">No outline data.</div>;
  return (
    <div className="outline-tree">
      {nodes.map((node) => (
        <OutlineItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          draggingAsset={draggingAsset}
          draggingOutlineId={draggingOutlineId}
          parentKind={null}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function OutlineItem({
  node,
  depth,
  selectedId,
  draggingAsset,
  draggingOutlineId,
  parentKind,
  onSelect,
}: {
  node: OutlineNode;
  depth: number;
  selectedId?: string | null;
  draggingAsset?: AssetItem | null;
  draggingOutlineId?: string | null;
  parentKind?: string | null;
  onSelect: (id: string) => void;
}) {
  const canDrag = parentKind === "section";
  const draggable = useDraggable({
    id: `outline-drag:${node.id}`,
    data: { type: "outline", nodeId: node.id },
    disabled: !canDrag,
  });
  const droppable = useDroppable({
    id: `outline:${node.id}`,
    data: { type: "outline-drop", nodeId: node.id },
  });
  const isSelected = selectedId === node.id;
  const allowAssetDrop = node.kind === "figure" || node.kind === "slot" || node.kind === "image";
  const allowReorderDrop = parentKind === "section";
  const showDropTarget =
    droppable.isOver && ((draggingAsset && allowAssetDrop) || (draggingOutlineId && allowReorderDrop));
  return (
    <div className="outline-item">
      <button
        type="button"
        ref={(el) => {
          droppable.setNodeRef(el);
          draggable.setNodeRef(el);
        }}
        className={`outline-btn ${isSelected ? "is-selected" : ""} ${showDropTarget ? "is-over" : ""} ${
          draggable.isDragging ? "is-dragging" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        onClick={() => onSelect(node.id)}
        {...draggable.attributes}
        {...draggable.listeners}
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
              draggingAsset={draggingAsset}
              draggingOutlineId={draggingOutlineId}
              parentKind={node.kind}
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
    data: { type: "asset", asset },
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

class EditorErrorBoundary extends Component<{ onError: (error: Error) => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function TextContentEditor({
  node,
  onRichTextUpdate,
  onPlainTextUpdate,
  onPlainTextCommit,
  onInlineSlotSelect,
  onReady,
  highlightQuery,
}: {
  node: DocumentNode;
  onRichTextUpdate: (json: JSONContent) => void;
  onPlainTextUpdate: (text: string) => void;
  onPlainTextCommit: (text: string) => void;
  onInlineSlotSelect: (id: string | null) => void;
  onReady?: (editor: any | null) => void;
  highlightQuery?: string;
}) {
  const [plainDraft, setPlainDraft] = useState(() => extractPlainText(node));
  const [fallback, setFallback] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    setPlainDraft(extractPlainText(node));
  }, [node.id, node.props, node.children]);

  useEffect(() => {
    setEditorReady(false);
    setFallback(false);
  }, [node.id]);

  useEffect(() => {
    if (editorReady || fallback) return;
    const timer = window.setTimeout(() => setFallback(true), 3000);
    return () => window.clearTimeout(timer);
  }, [editorReady, fallback]);

  useEffect(() => {
    if (fallback) onReady?.(null);
  }, [fallback, onReady]);

  if (fallback) {
    return (
      <div className="text-fallback-editor">
        <div className="fallback-banner">TipTap unavailable. Using fallback editor.</div>
        <textarea
          className="textarea"
          value={plainDraft}
          onChange={(event) => {
            const next = event.target.value;
            setPlainDraft(next);
            onPlainTextUpdate(next);
          }}
          onBlur={() => onPlainTextCommit(plainDraft)}
          rows={6}
          autoFocus
        />
      </div>
    );
  }

  return (
    <EditorErrorBoundary
      onError={() => {
        setFallback(true);
      }}
    >
      <RichTextEditor
        node={node}
        onUpdate={onRichTextUpdate}
        onInlineSlotSelect={onInlineSlotSelect}
        onReady={(editor) => {
          setEditorReady(Boolean(editor));
          onReady?.(editor);
        }}
        highlightQuery={highlightQuery}
      />
    </EditorErrorBoundary>
  );
}

function CaptionInspector({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value, label]);

  return (
    <div className="inspector-section">
      <div className="section-title">{label}</div>
      <label className="field">
        <span>Text</span>
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onCommit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit(draft);
            }
          }}
        />
      </label>
    </div>
  );
}

function SlotInspector({
  node,
  assets,
  runtime,
  onRuntimeChange,
  onLiteralChange,
  onGeneratorChange,
  onPropsChange,
}: {
  node: DocumentNode;
  assets: AssetItem[];
  runtime: { seed: number; time: number; docstep: number };
  onRuntimeChange: (inputs: Partial<{ seed: number; time: number; docstep: number }>) => void;
  onLiteralChange: (textId: string, text: string) => void;
  onGeneratorChange: (generator: SlotGeneratorSpec) => void;
  onPropsChange: (payload: { reserve?: string; fit?: string; refresh?: RefreshPolicy }) => void;
}) {
  const program = useMemo(() => readSlotProgram(node), [node]);
  const baseSpec = program.spec;
  const [variants, setVariants] = useState<string[]>(() => {
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") return [...baseSpec.values];
    if (baseSpec?.kind === "literal") return [baseSpec.value];
    return [];
  });
  const [tagsDraft, setTagsDraft] = useState<string[]>(() => (baseSpec?.kind === "assetsPick" ? baseSpec.tags : []));
  const [rateDraft, setRateDraft] = useState<number>(() => (baseSpec?.kind === "poisson" ? baseSpec.ratePerSec : 1));
  const [reserve, setReserve] = useState(getLiteralString(node.props?.reserve) ?? "fixedWidth(8, ch)");
  const [fit, setFit] = useState(getLiteralString(node.props?.fit) ?? "ellipsis");
  const [refresh, setRefresh] = useState(node.refresh?.kind ?? "onLoad");

  useEffect(() => {
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") {
      setVariants([...baseSpec.values]);
    } else if (baseSpec?.kind === "literal") {
      setVariants([baseSpec.value]);
    } else {
      setVariants([]);
    }
  }, [node.id, baseSpec?.kind, JSON.stringify(baseSpec)]);

  useEffect(() => {
    if (baseSpec?.kind === "assetsPick") setTagsDraft(baseSpec.tags);
  }, [baseSpec?.kind, JSON.stringify(baseSpec)]);

  useEffect(() => {
    if (baseSpec?.kind === "poisson") setRateDraft(baseSpec.ratePerSec);
  }, [baseSpec?.kind, baseSpec && "ratePerSec" in baseSpec ? baseSpec.ratePerSec : 0]);

  useEffect(() => {
    setReserve(getLiteralString(node.props?.reserve) ?? "fixedWidth(8, ch)");
    setFit(getLiteralString(node.props?.fit) ?? "ellipsis");
    setRefresh(node.refresh?.kind ?? "onLoad");
  }, [node.id, node.props, node.refresh]);

  const effectiveSpec = useMemo(() => {
    if (!baseSpec) return null;
    if (baseSpec.kind === "choose" || baseSpec.kind === "cycle") {
      return { ...baseSpec, values: variants };
    }
    if (baseSpec.kind === "literal") {
      return { ...baseSpec, value: variants[0] ?? "" };
    }
    if (baseSpec.kind === "assetsPick") {
      return { ...baseSpec, tags: tagsDraft };
    }
    if (baseSpec.kind === "poisson") {
      return { ...baseSpec, ratePerSec: rateDraft };
    }
    return baseSpec;
  }, [baseSpec, rateDraft, tagsDraft, variants]);

  const currentValue = useMemo(
    () => resolveSlotValue(effectiveSpec, runtime, node.id, assets) ?? "",
    [assets, effectiveSpec, node.id, runtime],
  );

  const simulation = useMemo(
    () => simulateSlotValues(effectiveSpec, runtime, node.id, assets, 12),
    [assets, effectiveSpec, node.id, runtime],
  );

  const candidateAssets = useMemo(() => {
    if (effectiveSpec?.kind !== "assetsPick") return [];
    return filterAssetsByTags(assets, effectiveSpec.tags);
  }, [assets, effectiveSpec]);

  const generatorDetails = useMemo(() => describeGenerator(effectiveSpec), [effectiveSpec]);

  const pushGeneratorUpdate = useDebouncedCallback((spec: SlotGeneratorSpec | null) => {
    if (!spec) return;
    if (spec.kind === "literal" && program.source.kind === "text" && program.source.textId) {
      onLiteralChange(program.source.textId, spec.value);
      return;
    }
    onGeneratorChange(spec);
  }, 220);

  const handleVariantChange = (index: number, value: string) => {
    const next = variants.map((item, idx) => (idx === index ? value : item));
    setVariants(next);
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") {
      pushGeneratorUpdate({ ...baseSpec, values: next });
    } else if (baseSpec?.kind === "literal") {
      pushGeneratorUpdate({ ...baseSpec, value });
    }
  };

  const handleAddVariant = () => {
    const next = [...variants, ""];
    setVariants(next);
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") {
      onGeneratorChange({ ...baseSpec, values: next });
    } else if (baseSpec?.kind === "literal") {
      onGeneratorChange({ kind: "choose", values: next });
    }
  };

  const handleRemoveVariant = (index: number) => {
    const next = variants.filter((_, idx) => idx !== index);
    setVariants(next);
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") {
      onGeneratorChange({ ...baseSpec, values: next });
    } else if (baseSpec?.kind === "literal") {
      onGeneratorChange({ kind: "choose", values: next });
    }
  };

  const handleMoveVariant = (index: number, delta: number) => {
    const next = [...variants];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moving] = next.splice(index, 1);
    next.splice(target, 0, moving);
    setVariants(next);
    if (baseSpec?.kind === "choose" || baseSpec?.kind === "cycle") {
      onGeneratorChange({ ...baseSpec, values: next });
    } else if (baseSpec?.kind === "literal") {
      onGeneratorChange({ kind: "choose", values: next });
    }
  };

  const showVariants =
    baseSpec?.kind === "choose" || baseSpec?.kind === "cycle" || baseSpec?.kind === "literal";
  const isNonEnumerable = !showVariants;

  return (
    <div className="inspector-section slot-program-section">
      <div className="section-title">Slot Program</div>
      <div className="slot-panels">
        <div className="slot-panel">
          <div className="panel-title">Current Value</div>
          <div className="slot-current">{currentValue || "—"}</div>
          <div className="slot-runtime">
            <div className="runtime-row">
              <span>Docstep</span>
              <div className="runtime-controls">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onRuntimeChange({ docstep: runtime.docstep - 1 })}>
                  −
                </button>
                <span>{runtime.docstep}</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onRuntimeChange({ docstep: runtime.docstep + 1 })}>
                  +
                </button>
              </div>
            </div>
            <div className="runtime-row">
              <span>Time</span>
              <div className="runtime-controls">
                <input
                  className="input input-compact"
                  type="number"
                  value={runtime.time}
                  onChange={(event) => onRuntimeChange({ time: Number(event.target.value) })}
                />
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onRuntimeChange({ time: runtime.time + 1 })}>
                  +1s
                </button>
              </div>
            </div>
            <div className="runtime-row">
              <span>Seed</span>
              <input
                className="input input-compact"
                type="number"
                value={runtime.seed}
                onChange={(event) => onRuntimeChange({ seed: Number(event.target.value) })}
              />
            </div>
          </div>
        </div>
        <div className="slot-panel">
          <div className="panel-title">Source / Generator</div>
          <div className="slot-source">
            {generatorDetails.length ? (
              generatorDetails.map((detail) => (
                <div key={detail.label} className="slot-source-row">
                  <span>{detail.label}</span>
                  <span>{detail.value}</span>
                </div>
              ))
            ) : (
              <div className="section-hint">No generator metadata available.</div>
            )}
          </div>
          {baseSpec?.kind === "assetsPick" ? (
            <label className="field">
              <span>Tags</span>
              <input
                className="input"
                value={tagsDraft.join(", ")}
                onChange={(event) => {
                  const next = event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  setTagsDraft(next);
                  onGeneratorChange({ ...baseSpec, tags: next });
                }}
              />
            </label>
          ) : null}
          {baseSpec?.kind === "poisson" ? (
            <label className="field">
              <span>Rate / sec</span>
              <input
                className="input"
                type="number"
                value={rateDraft}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setRateDraft(next);
                  onGeneratorChange({ ...baseSpec, ratePerSec: next });
                }}
              />
            </label>
          ) : null}
        </div>
        <div className="slot-panel">
          <div className="panel-title">Variants / Schedule</div>
          {showVariants ? (
            <div className="variant-list">
              {variants.map((value, index) => (
                <div key={index} className="variant-row">
                  <input
                    className="input"
                    value={value}
                    onChange={(event) => handleVariantChange(index, event.target.value)}
                  />
                  <div className="variant-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleMoveVariant(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleMoveVariant(index, 1)}
                      disabled={index === variants.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRemoveVariant(index)}
                      disabled={variants.length <= 1 && baseSpec?.kind === "literal"}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-xs" onClick={handleAddVariant}>
                Add variant
              </button>
            </div>
          ) : isNonEnumerable ? (
            <div className="slot-non-enum">
              {baseSpec?.kind === "assetsPick" ? (
                <div className="slot-candidates">
                  <div className="slot-candidates-title">Candidates</div>
                  {candidateAssets.length ? (
                    <ul>
                      {candidateAssets.map((asset) => (
                        <li key={asset.id}>{asset.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="section-hint">No assets match the current tags.</div>
                  )}
                </div>
              ) : null}
              <div className="slot-sim">
                <div className="slot-candidates-title">Simulate next 12</div>
                <div className="slot-sim-table">
                  <div className="slot-sim-head">
                    <span>Docstep</span>
                    <span>Time</span>
                    <span>Value</span>
                  </div>
                  {simulation.map((row) => (
                    <div key={`${row.docstep}-${row.time}`} className="slot-sim-row">
                      <span>{row.docstep}</span>
                      <span>{row.time}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="section-hint">Generator details are unavailable.</div>
          )}
        </div>
      </div>
      <div className="slot-props">
        <label className="field">
          <span>Reserve</span>
          <input
            className="input"
            value={reserve}
            onChange={(event) => setReserve(event.target.value)}
            onBlur={() => onPropsChange({ reserve })}
          />
        </label>
        <label className="field">
          <span>Fit</span>
          <select
            className="select"
            value={fit}
            onChange={(event) => {
              setFit(event.target.value);
              onPropsChange({ fit: event.target.value });
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
              onPropsChange({ refresh: parseRefresh(event.target.value) });
            }}
          >
            <option value="onLoad">On load</option>
            <option value="onDocstep">Docstep</option>
            <option value="every">Time</option>
            <option value="never">Never</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function ImageFrameInspector({
  frame,
  adjustMode,
  onToggleAdjust,
  onChange,
  onCommit,
  onReset,
}: {
  frame: ImageFrame;
  adjustMode: boolean;
  onToggleAdjust: () => void;
  onChange: (frame: ImageFrame) => void;
  onCommit: (frame: ImageFrame) => void;
  onReset: () => void;
}) {
  const handlePatch = (patch: Partial<ImageFrame>) => {
    onChange({ ...frame, ...patch });
  };

  const commitPatch = (patch: Partial<ImageFrame>) => {
    onCommit({ ...frame, ...patch });
  };

  return (
    <div className="inspector-section frame-section">
      <div className="section-title">Frame</div>
      <div className="frame-toolbar">
        <button
          type="button"
          className={`btn btn-ghost btn-xs ${adjustMode ? "is-active" : ""}`}
          onClick={onToggleAdjust}
        >
          Adjust image
        </button>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onReset}>
          Reset
        </button>
      </div>
      <label className="field">
        <span>Fit</span>
        <select
          className="select"
          value={frame.fit}
          onChange={(event) => commitPatch({ fit: event.target.value as ImageFrame["fit"] })}
        >
          <option value="contain">contain</option>
          <option value="cover">cover</option>
        </select>
      </label>
      <label className="field">
        <span>Scale</span>
        <input
          className="range"
          type="range"
          min={0.5}
          max={2.5}
          step={0.01}
          value={frame.scale}
          onChange={(event) => handlePatch({ scale: Number(event.target.value) })}
          onPointerUp={(event) => commitPatch({ scale: Number((event.target as HTMLInputElement).value) })}
        />
        <div className="frame-value">{frame.scale.toFixed(2)}×</div>
      </label>
      <div className="frame-grid">
        <label className="field">
          <span>Offset X</span>
          <input
            className="input"
            type="number"
            value={Math.round(frame.offsetX)}
            onChange={(event) => handlePatch({ offsetX: Number(event.target.value) })}
            onBlur={(event) => commitPatch({ offsetX: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>Offset Y</span>
          <input
            className="input"
            type="number"
            value={Math.round(frame.offsetY)}
            onChange={(event) => handlePatch({ offsetY: Number(event.target.value) })}
            onBlur={(event) => commitPatch({ offsetY: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="frame-nudge">
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => commitPatch({ offsetY: frame.offsetY - 1 })}>
          ↑
        </button>
        <div className="frame-nudge-row">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => commitPatch({ offsetX: frame.offsetX - 1 })}>
            ←
          </button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => commitPatch({ offsetX: frame.offsetX + 1 })}>
            →
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => commitPatch({ offsetY: frame.offsetY + 1 })}>
          ↓
        </button>
      </div>
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

type SlotGeneratorSpec =
  | { kind: "literal"; value: string }
  | { kind: "choose"; values: string[] }
  | { kind: "cycle"; values: string[]; period?: number }
  | { kind: "assetsPick"; tags: string[]; bank?: string }
  | { kind: "poisson"; ratePerSec: number }
  | { kind: "at"; times: number[]; values: string[] }
  | { kind: "every"; amount: number; unit?: string; values?: string[] }
  | { kind: "unknown"; summary: string };

type SlotProgram = {
  spec: SlotGeneratorSpec | null;
  raw: unknown;
  source: { kind: "prop" | "text"; key?: string; textId?: string };
};

type SlotSimulationRow = { docstep: number; time: number; value: string };

type CaptionTarget = { kind: "prop" | "text"; id: string; value: string };

function readSlotProgram(node: DocumentNode): SlotProgram {
  const props = node.props ?? {};
  const textChild = node.children?.find((child) => child.kind === "text");
  const propEntry = findSlotGeneratorProp(props);
  if (propEntry) {
    const expr = unwrapExpression(propEntry.value);
    const spec = parseGeneratorSpec(expr);
    return {
      spec,
      raw: propEntry.value,
      source: { kind: "prop", key: propEntry.key },
    };
  }
  if (textChild) {
    const value = getLiteralString(textChild.props?.content) ?? "";
    return {
      spec: { kind: "literal", value },
      raw: textChild.props?.content ?? null,
      source: { kind: "text", textId: textChild.id },
    };
  }
  const literalContent = getLiteralString(props.content as any);
  if (literalContent !== null) {
    return {
      spec: { kind: "literal", value: literalContent ?? "" },
      raw: props.content ?? null,
      source: { kind: "prop", key: "content" },
    };
  }
  return { spec: null, raw: null, source: { kind: "prop" } };
}

function resolveSlotDisplayText(node: DocumentNode, runtime: { seed: number; time: number; docstep: number }, assets: AssetItem[]): string {
  const program = readSlotProgram(node);
  const resolved = resolveSlotValue(program.spec, runtime, node.id, assets);
  if (resolved !== null && resolved !== undefined) return resolved;
  const textChild = node.children?.find((child) => child.kind === "text");
  return getLiteralString(textChild?.props?.content) ?? "";
}

function resolveSlotValue(
  spec: SlotGeneratorSpec | null,
  runtime: { seed: number; time: number; docstep: number },
  slotId: string,
  assets: AssetItem[],
): string | null {
  if (!spec) return null;
  if (spec.kind === "literal") return spec.value;
  if (spec.kind === "choose") {
    if (!spec.values.length) return "";
    const index = seededIndex(runtime, slotId, spec.values.length);
    return spec.values[index] ?? "";
  }
  if (spec.kind === "cycle") {
    if (!spec.values.length) return "";
    const index = Math.abs(runtime.docstep) % spec.values.length;
    return spec.values[index] ?? "";
  }
  if (spec.kind === "assetsPick") {
    const candidates = filterAssetsByTags(assets, spec.tags);
    if (!candidates.length) return "";
    const index = seededIndex(runtime, slotId, candidates.length);
    const asset = candidates[index];
    return asset?.name ?? asset?.path ?? "";
  }
  if (spec.kind === "poisson") {
    const rate = Math.max(0, spec.ratePerSec);
    const chance = Math.min(1, rate / 2);
    const random = seededRandom(runtime, slotId);
    return random < chance ? "event" : "—";
  }
  if (spec.kind === "at") {
    if (!spec.values.length) return "";
    const index = seededIndex(runtime, slotId, spec.values.length);
    return spec.values[index] ?? "";
  }
  if (spec.kind === "every") {
    if (spec.values?.length) {
      const index = seededIndex(runtime, slotId, spec.values.length);
      return spec.values[index] ?? "";
    }
    return "";
  }
  return null;
}

function simulateSlotValues(
  spec: SlotGeneratorSpec | null,
  runtime: { seed: number; time: number; docstep: number },
  slotId: string,
  assets: AssetItem[],
  count = 12,
): SlotSimulationRow[] {
  if (!spec) return [];
  const rows: SlotSimulationRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const nextRuntime = {
      ...runtime,
      docstep: runtime.docstep + i,
      time: Math.round((runtime.time + i) * 100) / 100,
    };
    const value = resolveSlotValue(spec, nextRuntime, slotId, assets) ?? "";
    rows.push({ docstep: nextRuntime.docstep, time: nextRuntime.time, value: value || "—" });
  }
  return rows;
}

function filterAssetsByTags(assets: AssetItem[], tags: string[]): AssetItem[] {
  if (!tags.length) return assets;
  return assets.filter((asset) => tags.every((tag) => asset.tags.includes(tag)));
}

function describeGenerator(spec: SlotGeneratorSpec | null): { label: string; value: string }[] {
  if (!spec) return [];
  if (spec.kind === "literal") return [{ label: "kind", value: "literal" }, { label: "value", value: spec.value }];
  if (spec.kind === "choose" || spec.kind === "cycle") {
    return [
      { label: "kind", value: spec.kind },
      { label: "count", value: String(spec.values.length) },
      { label: "values", value: spec.values.join(" · ") || "—" },
    ];
  }
  if (spec.kind === "assetsPick") {
    return [
      { label: "kind", value: "assets.pick" },
      { label: "tags", value: spec.tags.join(", ") || "—" },
    ];
  }
  if (spec.kind === "poisson") {
    return [
      { label: "kind", value: "poisson" },
      { label: "rate/sec", value: String(spec.ratePerSec) },
    ];
  }
  if (spec.kind === "at") {
    return [
      { label: "kind", value: "at" },
      { label: "values", value: spec.values.join(" · ") || "—" },
    ];
  }
  if (spec.kind === "every") {
    return [
      { label: "kind", value: "every" },
      { label: "amount", value: String(spec.amount) },
      { label: "unit", value: spec.unit ?? "—" },
    ];
  }
  return [{ label: "kind", value: "unknown" }, { label: "summary", value: spec.summary }];
}

function findSlotGeneratorProp(props: Record<string, unknown>): { key: string; value: unknown } | null {
  const preferred = ["generator", "source", "program", "content", "value"];
  for (const key of preferred) {
    if (!(key in props)) continue;
    const value = (props as Record<string, unknown>)[key];
    if (key === "content" && isLiteralProp(value)) continue;
    if (value !== undefined) return { key, value };
  }
  for (const [key, value] of Object.entries(props)) {
    if (IGNORED_SLOT_PROP_KEYS.has(key)) continue;
    if (value && typeof value === "object" && !(value as any).kind) {
      return { key, value };
    }
    if (!isLiteralProp(value)) return { key, value };
  }
  return null;
}

function unwrapExpression(value: any): any {
  if (!value || typeof value !== "object") return value;
  if (value.kind === "LiteralValue") return { kind: "Literal", value: value.value };
  if (value.kind === "ExpressionValue" || value.kind === "ExprValue") {
    return value.expr ?? value.expression ?? value.value ?? value;
  }
  return value;
}

function parseGeneratorSpec(expr: any): SlotGeneratorSpec | null {
  if (!expr) return null;
  if (expr.kind === "choose" && Array.isArray(expr.values)) {
    return { kind: "choose", values: expr.values.map((value: any) => String(value)) };
  }
  if (expr.kind === "cycle" && Array.isArray(expr.values)) {
    return { kind: "cycle", values: expr.values.map((value: any) => String(value)) };
  }
  if (expr.kind === "assetsPick" && Array.isArray(expr.tags)) {
    return { kind: "assetsPick", tags: expr.tags.map((tag: any) => String(tag)), bank: expr.bank };
  }
  if (expr.kind === "poisson" && typeof expr.ratePerSec === "number") {
    return { kind: "poisson", ratePerSec: expr.ratePerSec };
  }
  if (expr.kind === "literal" && "value" in expr) {
    return { kind: "literal", value: String(expr.value ?? "") };
  }
  if (expr.kind === "Literal") {
    return { kind: "literal", value: String(expr.value ?? "") };
  }
  if (expr.kind === "CallExpression") {
    const callee = getCalleeName(expr.callee);
    const args = Array.isArray(expr.args) ? expr.args : [];
    if (!callee) return { kind: "unknown", summary: "call" };
    if (callee === "choose" || callee === "cycle") {
      const values = extractStringList(args);
      return { kind: callee, values };
    }
    if (callee === "poisson") {
      const rate = readNumberLiteral(args[0]) ?? 1;
      return { kind: "poisson", ratePerSec: rate };
    }
    if (callee === "at") {
      const values = extractStringList(args.slice(1));
      const times = extractNumberList(args.slice(0, 1));
      return { kind: "at", times, values };
    }
    if (callee === "every") {
      const amount = readNumberLiteral(args[0]) ?? 1;
      const values = extractStringList(args.slice(1));
      return { kind: "every", amount, unit: undefined, values };
    }
    if (callee === "assets.pick" || callee === "assetsPick") {
      const tags = extractStringList(args);
      return { kind: "assetsPick", tags };
    }
    return { kind: "unknown", summary: callee };
  }
  if (expr.kind === "Identifier") {
    return { kind: "unknown", summary: expr.name ?? "identifier" };
  }
  return { kind: "unknown", summary: "expression" };
}

function getCalleeName(expr: any): string | null {
  if (!expr || typeof expr !== "object") return null;
  if (expr.kind === "Identifier") return expr.name;
  if (expr.kind === "MemberExpression") {
    const objectName = getCalleeName(expr.object);
    const property = expr.property;
    if (!objectName) return property ?? null;
    return `${objectName}.${property ?? ""}`.replace(/\.$/, "");
  }
  return null;
}

function extractStringList(args: any[]): string[] {
  if (!args.length) return [];
  if (args.length === 1) {
    const literalArray = readArrayLiteral(args[0]);
    if (literalArray.length) return literalArray;
  }
  return args.map((arg) => readStringLiteral(arg)).filter((value): value is string => typeof value === "string");
}

function extractNumberList(args: any[]): number[] {
  return args.map((arg) => readNumberLiteral(arg)).filter((value): value is number => typeof value === "number");
}

function readArrayLiteral(expr: any): string[] {
  if (!expr) return [];
  if (expr.kind === "Literal" && Array.isArray(expr.value)) {
    return expr.value.map((value: any) => String(value));
  }
  return [];
}

function readStringLiteral(expr: any): string | null {
  if (!expr) return null;
  if (expr.kind === "Literal" && (typeof expr.value === "string" || typeof expr.value === "number")) {
    return String(expr.value);
  }
  return null;
}

function readNumberLiteral(expr: any): number | null {
  if (!expr) return null;
  if (expr.kind === "Literal" && typeof expr.value === "number") return expr.value;
  if (expr.kind === "Literal" && typeof expr.value === "string") {
    const parsed = Number(expr.value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function buildGeneratorExpr(spec: SlotGeneratorSpec): any | null {
  if (spec.kind === "literal") {
    return { kind: "Literal", value: spec.value };
  }
  if (spec.kind === "choose" || spec.kind === "cycle") {
    return {
      kind: "CallExpression",
      callee: { kind: "Identifier", name: spec.kind },
      args: spec.values.map((value) => ({ kind: "Literal", value })),
    };
  }
  if (spec.kind === "assetsPick") {
    return {
      kind: "CallExpression",
      callee: {
        kind: "MemberExpression",
        object: { kind: "Identifier", name: "assets" },
        property: "pick",
      },
      args: spec.tags.map((tag) => ({ kind: "Literal", value: tag })),
    };
  }
  if (spec.kind === "poisson") {
    return {
      kind: "CallExpression",
      callee: { kind: "Identifier", name: "poisson" },
      args: [{ kind: "Literal", value: spec.ratePerSec }],
    };
  }
  if (spec.kind === "at") {
    return {
      kind: "CallExpression",
      callee: { kind: "Identifier", name: "at" },
      args: [
        ...spec.times.map((time) => ({ kind: "Literal", value: time })),
        ...spec.values.map((value) => ({ kind: "Literal", value })),
      ],
    };
  }
  if (spec.kind === "every") {
    return {
      kind: "CallExpression",
      callee: { kind: "Identifier", name: "every" },
      args: [
        { kind: "Literal", value: spec.amount },
        ...(spec.values ?? []).map((value) => ({ kind: "Literal", value })),
      ],
    };
  }
  return null;
}

function wrapExpressionValue(expr: any): Record<string, unknown> {
  return { kind: "ExpressionValue", expr };
}

function seededIndex(runtime: { seed: number; time: number; docstep: number }, slotId: string, length: number): number {
  if (length <= 0) return 0;
  const base = hashString(slotId) + runtime.seed * 97 + runtime.docstep * 13 + Math.floor(runtime.time) * 3;
  const hashed = hashNumber(base);
  return Math.abs(hashed) % length;
}

function seededRandom(runtime: { seed: number; time: number; docstep: number }, slotId: string): number {
  const base = hashString(slotId) + runtime.seed * 131 + runtime.docstep * 17 + Math.floor(runtime.time);
  const hashed = hashNumber(base);
  return (hashed >>> 0) / 4294967295;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function hashNumber(value: number): number {
  let x = value | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return x;
}

function isLiteralProp(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as any).kind === "LiteralValue");
}

function resolveCaptionTarget(node: DocumentNode): CaptionTarget | null {
  const propCaption = getLiteralString(node.props?.caption);
  if (propCaption !== null) return { kind: "prop", id: node.id, value: propCaption ?? "" };
  const captionNode = findCaptionTextNode(node);
  if (captionNode) {
    return {
      kind: "text",
      id: captionNode.id,
      value: getLiteralString(captionNode.props?.content) ?? extractPlainText(captionNode),
    };
  }
  return null;
}

function findCaptionTextNode(node: DocumentNode): DocumentNode | null {
  let fallback: DocumentNode | null = null;
  const visit = (current: DocumentNode): DocumentNode | null => {
    if (current.kind === "text") {
      const role = getLiteralString(current.props?.role) ?? "";
      const style = getLiteralString(current.props?.style) ?? "";
      if (/caption/i.test(role) || /caption/i.test(style)) return current;
      if (!fallback) fallback = current;
    }
    for (const child of current.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(node) ?? fallback;
}

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "1") return true;
  return window.localStorage.getItem("flux-editor-debug") === "1";
}

const IGNORED_SLOT_PROP_KEYS = new Set([
  "reserve",
  "fit",
  "refresh",
  "frame",
  "src",
  "title",
  "caption",
  "label",
  "style",
  "role",
  "url",
  "href",
  "name",
]);

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
  if (value === "every") return { kind: "every", amount: 1, unit: "s" } as RefreshPolicy;
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

function isSlotContext(entry: DocIndexEntry, index: Map<string, DocIndexEntry>): boolean {
  let current: DocIndexEntry | null = entry;
  while (current) {
    if (current.node.kind === "slot" || current.node.kind === "inline_slot") return true;
    current = current.parentId ? index.get(current.parentId) ?? null : null;
  }
  return false;
}


function resolveFrameEntry(
  entry: DocIndexEntry | null,
  index: Map<string, DocIndexEntry> | null | undefined,
): DocIndexEntry | null {
  if (!entry || !index) return null;
  if (entry.node.kind === "image") return entry;
  if (entry.node.kind === "slot" || entry.node.kind === "figure") {
    const imageNode = findFirstChild(entry.node, "image");
    if (!imageNode) return null;
    return index.get(imageNode.id) ?? null;
  }
  return null;
}

function readImageFrame(node: DocumentNode): ImageFrame {
  const raw = getLiteralValue(node.props?.frame);
  if (raw && typeof raw === "object") {
    const record = raw as Partial<ImageFrame>;
    return {
      fit: record.fit === "contain" ? "contain" : "cover",
      scale: typeof record.scale === "number" ? record.scale : 1,
      offsetX: typeof record.offsetX === "number" ? record.offsetX : 0,
      offsetY: typeof record.offsetY === "number" ? record.offsetY : 0,
    };
  }
  return defaultImageFrame();
}

function updateImageFrameNode(node: DocumentNode, frame: ImageFrame): DocumentNode {
  const props: Record<string, NodePropValue> = { ...(node.props ?? {}) };
  props.frame = { kind: "LiteralValue", value: frame };
  return { ...node, props };
}

function defaultImageFrame(): ImageFrame {
  return { fit: "cover", scale: 1, offsetX: 0, offsetY: 0 };
}

function reorderChildren(parent: DocumentNode, activeId: string, overId: string): DocumentNode | null {
  const children = [...(parent.children ?? [])];
  const from = children.findIndex((child) => child.id === activeId);
  const to = children.findIndex((child) => child.id === overId);
  if (from < 0 || to < 0) return null;
  const [moving] = children.splice(from, 1);
  const insertIndex = from < to ? to - 1 : to;
  children.splice(insertIndex, 0, moving);
  return { ...parent, children };
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
  const fluxEl = target?.closest?.("[data-flux-id], [data-flux-node]") as HTMLElement | null;
  if (!fluxEl) return false;
  const nodeId = fluxEl.getAttribute("data-flux-id") ?? fluxEl.getAttribute("data-flux-node");
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
