export type ImageFrame = {
  fit: "contain" | "cover";
  scale: number;
  offsetX: number;
  offsetY: number;
};

const SLOT_INNER_ATTR = "data-flux-slot-inner";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

export function sanitizeSlotText(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

export function findFluxElement(doc: Document, id: string): HTMLElement | null {
  const escaped = escapeSelector(id);
  return (
    doc.querySelector(`[data-flux-id=\"${escaped}\"]`) ||
    doc.querySelector(`[data-flux-node=\"${escaped}\"]`)
  ) as HTMLElement | null;
}

export function ensureFluxAttributes(el: HTMLElement, id?: string, kind?: string) {
  if (id && !el.getAttribute("data-flux-id")) {
    el.setAttribute("data-flux-id", id);
  }
  if (kind && !el.getAttribute("data-flux-kind")) {
    el.setAttribute("data-flux-kind", kind);
  }
}

export function normalizeInlineSlotOuter(el: HTMLElement): HTMLElement {
  if (el.tagName === "SPAN") return el;
  const doc = el.ownerDocument;
  const replacement = doc.createElement("span");
  Array.from(el.attributes).forEach((attr) => replacement.setAttribute(attr.name, attr.value));
  while (el.firstChild) {
    replacement.appendChild(el.firstChild);
  }
  el.replaceWith(replacement);
  return replacement;
}

export function ensureSlotInnerWrapper(outer: HTMLElement, inline: boolean): HTMLElement {
  const doc = outer.ownerDocument;
  let inner = outer.querySelector<HTMLElement>(`[${SLOT_INNER_ATTR}]`);
  if (!inner) {
    inner = doc.createElement(inline ? "span" : "div");
    inner.setAttribute(SLOT_INNER_ATTR, "");
    outer.appendChild(inner);
  }

  if (inline && inner.tagName !== "SPAN") {
    const replacement = doc.createElement("span");
    replacement.setAttribute(SLOT_INNER_ATTR, "");
    Array.from(inner.attributes).forEach((attr) => {
      if (attr.name !== SLOT_INNER_ATTR) replacement.setAttribute(attr.name, attr.value);
    });
    while (inner.firstChild) {
      replacement.appendChild(inner.firstChild);
    }
    inner.replaceWith(replacement);
    inner = replacement;
  }

  const nodes = Array.from(outer.childNodes).filter((node) => node !== inner);
  for (const node of nodes) {
    inner.appendChild(node);
  }

  return inner;
}

export function patchSlotText(outer: HTMLElement, text: string, inline: boolean): HTMLElement {
  const targetOuter = inline ? normalizeInlineSlotOuter(outer) : outer;
  const inner = ensureSlotInnerWrapper(targetOuter, inline);
  inner.innerHTML = escapeHtml(text);
  return targetOuter;
}

export function ensurePreviewStyle(doc: Document) {
  if (doc.getElementById("flux-editor-preview-style")) return;
  const style = doc.createElement("style");
  style.id = "flux-editor-preview-style";
  style.textContent = `

    .flux-editor-show-ids [data-flux-id][data-flux-kind="page"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="section"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="figure"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="callout"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="table"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="slot"],
    .flux-editor-show-ids [data-flux-id][data-flux-slot="true"] {
      position: relative;
    }

    .flux-editor-show-ids [data-flux-id][data-flux-kind="page"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="section"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="figure"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="callout"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="table"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="slot"][data-flux-selected="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-slot="true"][data-flux-selected="true"] {
      outline: 2px solid rgba(31, 200, 183, 0.7);
      outline-offset: 2px;
    }

    .flux-editor-show-ids [data-flux-id][data-flux-kind="page"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="section"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="figure"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="callout"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="table"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-kind="slot"][data-flux-hovered="true"],
    .flux-editor-show-ids [data-flux-id][data-flux-slot="true"][data-flux-hovered="true"] {
      outline: 1px solid rgba(31, 200, 183, 0.45);
      outline-offset: 2px;
    }

    .flux-editor-show-ids [data-flux-id][data-flux-kind="page"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="section"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="figure"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="callout"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="table"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="slot"][data-flux-selected="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="page"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="section"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="figure"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="callout"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="table"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-kind="slot"][data-flux-hovered="true"]::after,
    .flux-editor-show-ids [data-flux-id][data-flux-slot="true"]::after {
      content: attr(data-flux-id);
      position: absolute;
      top: -14px;
      left: 0;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
      line-height: 1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #0f172a;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
      pointer-events: none;
      z-index: 40;
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .flux-editor-show-ids [data-flux-id][data-flux-slot="true"]::after {
      background: rgba(31, 200, 183, 0.12);
      color: #0f172a;
    }

    .flux-editor-adjust-image [data-flux-frame-target="true"] {
      cursor: grab;
    }

    .flux-editor-adjust-image [data-flux-frame-target="true"]:active {
      cursor: grabbing;
    }
  `;
  doc.head.appendChild(style);
}

export function setPreviewRootClass(doc: Document, className: string, enabled: boolean) {
  const root = doc.documentElement;
  root.classList.toggle(className, enabled);
}

export function applyImageFrame(element: HTMLElement, frame: ImageFrame) {
  const target = element.tagName === "IMG" ? (element as HTMLImageElement) : element.querySelector("img");
  if (!target) return;
  target.style.setProperty("--flux-frame-ox", `${frame.offsetX}px`);
  target.style.setProperty("--flux-frame-oy", `${frame.offsetY}px`);
  target.style.setProperty("--flux-frame-scale", `${frame.scale}`);
  target.style.objectFit = frame.fit;
  target.style.transform = "translate(var(--flux-frame-ox), var(--flux-frame-oy)) scale(var(--flux-frame-scale))";
  target.style.transformOrigin = "center";
  target.style.willChange = "transform";
  (target as HTMLElement).setAttribute("data-flux-frame-target", "true");
}
