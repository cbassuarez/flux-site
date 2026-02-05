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
import { createDocService, type AssetItem, type DocIndexEntry } from "./docService";
import { buildOutlineFromDoc, extractPlainText, getLiteralString, getLiteralValue, type OutlineNode } from "./docModel";
import RichTextEditor from "./RichTextEditor";
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
  const [showIds, setShowIds] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  const [isApplying, setIsApplying] = useState(false);
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
    setSelectedId(outline[0].id);
  }, [outline, selectedId]);

  const selectedEntry = useMemo(() => {
    if (!selectedId || !doc?.index) return null;
    return doc.index.get(selectedId) ?? null;
  }, [doc?.index, selectedId]);

  const selectedNode = selectedEntry?.node ?? null;
  const existingIds = useMemo(() => new Set(doc?.index?.keys() ?? []), [doc?.index]);
  const frameEntry = useMemo(() => resolveFrameEntry(selectedEntry, doc?.index), [doc?.index, selectedEntry]);
  const slotHasImage = useMemo(() => {
    if (!selectedNode || selectedNode.kind !== "slot") return false;
    return Boolean(findFirstChild(selectedNode, "image"));
  }, [selectedNode]);

  const activeTextEntry = useMemo(() => {
    if (!selectedEntry || !doc?.index) return null;
    let entry: typeof selectedEntry | null = selectedEntry;
    while (entry && entry.node.kind !== "text") {
      entry = entry.parentId ? doc.index.get(entry.parentId) ?? null : null;
    }
    return entry;
  }, [selectedEntry, doc?.index]);

  const activeTextNode = activeTextEntry?.node ?? null;

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
      const textNode = entry.node.children?.find((child) => child.kind === "text");
      const text = getLiteralString(textNode?.props?.content) ?? "";
      const slotEl = findFluxElement(frameDoc, entry.id);
      if (!slotEl) continue;
      ensureFluxAttributes(slotEl, entry.id, entry.node.kind);
      patchSlotText(slotEl, sanitizeSlotText(text), entry.node.kind === "inline_slot");
    }
  }, [doc?.index]);

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
      if (nodeId) setSelectedId(String(nodeId));
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
        setTransformError(null);
        if (successMessage) setToast({ kind: "success", message: successMessage });
      } else {
        setSaveStatus("error");
        const message = nextState.error ?? "Transform failed";
        setTransformError(message);
        setToast({ kind: "error", message });
      }
    },
    [docService],
  );

  const debouncedRichTextUpdate = useDebouncedCallback((node: DocumentNode) => {
    void handleTransform({ op: "replaceNode", args: { id: node.id, node } });
  }, 400);

  const applySlotText = useCallback(
    (slotId: string, text: string) => {
      if (!doc?.index) return;
      const entry = doc.index.get(slotId);
      if (!entry) return;
      if (entry.node.kind !== "inline_slot" && entry.node.kind !== "slot") return;
      const sanitized = sanitizeSlotText(text);
      patchPreviewSlotText(previewFrameRef.current, entry, sanitized);
      const ids = new Set(doc.index.keys());
      const nextNode = buildSlotTextNode(entry.node, sanitized, ids);
      void handleTransform({ op: "replaceNode", args: { id: nextNode.id, node: nextNode } });
    },
    [doc?.index, handleTransform],
  );

  const debouncedSlotTextUpdate = useDebouncedCallback((slotId: string, text: string) => {
    applySlotText(slotId, text);
  }, 220);

  const applySlotProps = useCallback(
    (slotId: string, payload: { reserve?: string; fit?: string; refresh?: RefreshPolicy }) => {
      if (!doc?.index) return;
      const entry = doc.index.get(slotId);
      if (!entry) return;
      if (entry.node.kind !== "inline_slot" && entry.node.kind !== "slot") return;
      const nextNode = updateSlotProps(entry.node, payload);
      void handleTransform({ op: "replaceNode", args: { id: nextNode.id, node: nextNode } });
    },
    [doc?.index, handleTransform],
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
      setSelectedId(activeId);
    },
    [doc?.index, handleTransform],
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
        action: () => setSelectedId(item.id),
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
                    onSelect={setSelectedId}
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
                            {transformError ? <div className="inspector-alert">{transformError}</div> : null}

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

                            {selectedNode.kind === "inline_slot" || selectedNode.kind === "slot" ? (
                              <SlotInspector
                                node={selectedNode}
                                disableText={selectedNode.kind === "slot" && slotHasImage}
                                onTextChange={(value) => debouncedSlotTextUpdate(selectedNode.id, value)}
                                onTextCommit={(value) => applySlotText(selectedNode.id, value)}
                                onPropsChange={(payload) => applySlotProps(selectedNode.id, payload)}
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

function SlotInspector({
  node,
  disableText,
  onTextChange,
  onTextCommit,
  onPropsChange,
}: {
  node: DocumentNode;
  disableText?: boolean;
  onTextChange: (value: string) => void;
  onTextCommit: (value: string) => void;
  onPropsChange: (payload: { reserve?: string; fit?: string; refresh?: RefreshPolicy }) => void;
}) {
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
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            onTextChange(next);
          }}
          onBlur={() => onTextCommit(text)}
          disabled={disableText}
        />
      </label>
      {disableText ? <div className="section-hint">Image slot content is managed by the frame editor.</div> : null}
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

function buildSlotTextNode(node: DocumentNode, text: string, ids: Set<string>): DocumentNode {
  const safe = sanitizeSlotText(text);
  const textChild = node.children?.find((child) => child.kind === "text");
  const textId = textChild?.id ?? nextId("slotText", ids);
  return {
    ...node,
    children: [
      {
        id: textId,
        kind: "text",
        props: { content: { kind: "LiteralValue", value: safe } },
        children: [],
      },
    ],
  };
}

function updateSlotProps(
  node: DocumentNode,
  payload: { reserve?: string; fit?: string; refresh?: RefreshPolicy },
): DocumentNode {
  const props: Record<string, NodePropValue> = { ...(node.props ?? {}) };
  if (payload.reserve !== undefined) props.reserve = { kind: "LiteralValue", value: payload.reserve };
  if (payload.fit !== undefined) props.fit = { kind: "LiteralValue", value: payload.fit };
  return {
    ...node,
    props,
    refresh: payload.refresh ?? node.refresh,
  };
}

function patchPreviewSlotText(frame: HTMLIFrameElement | null, entry: DocIndexEntry, text: string) {
  const frameDoc = frame?.contentDocument;
  if (!frameDoc) return;
  const slotEl = findFluxElement(frameDoc, entry.id);
  if (!slotEl) return;
  ensureFluxAttributes(slotEl, entry.id, entry.node.kind);
  patchSlotText(slotEl, text, entry.node.kind === "inline_slot");
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
