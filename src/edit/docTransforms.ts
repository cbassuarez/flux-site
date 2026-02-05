import type { DocumentNode, FluxDocument, NodePropValue, RefreshPolicy } from "@flux-lang/core";
import { getLiteralString } from "./docModel";

export type InlineSlotUpdate = {
  text?: string;
  reserve?: string;
  fit?: string;
  refresh?: RefreshPolicy;
};

export function collectIds(doc: FluxDocument | null): Set<string> {
  const ids = new Set<string>();
  const visit = (node: DocumentNode) => {
    ids.add(node.id);
    node.children?.forEach(visit);
  };
  doc?.body?.nodes?.forEach(visit);
  return ids;
}

export function insertTextSection(doc: FluxDocument): { doc: FluxDocument; newIds: string[] } {
  const ids = collectIds(doc);
  const nextIds: string[] = [];
  const makeId = (prefix: string) => {
    let n = 1;
    let candidate = `${prefix}${n}`;
    while (ids.has(candidate)) {
      n += 1;
      candidate = `${prefix}${n}`;
    }
    ids.add(candidate);
    nextIds.push(candidate);
    return candidate;
  };

  const headingId = makeId("text");
  const bodyId = makeId("text");
  const sectionId = makeId("section");

  const heading: DocumentNode = {
    id: headingId,
    kind: "text",
    props: {
      style: { kind: "LiteralValue", value: "H2" },
      content: { kind: "LiteralValue", value: "Section Heading" },
    },
    children: [],
  };

  const body: DocumentNode = {
    id: bodyId,
    kind: "text",
    props: { content: { kind: "LiteralValue", value: "Start writing here." } },
    children: [],
  };

  const section: DocumentNode = {
    id: sectionId,
    kind: "section",
    props: {},
    children: [heading, body],
  };

  const next: FluxDocument = {
    ...doc,
    body: {
      nodes: [...(doc.body?.nodes ?? [])],
    },
  };

  const pages = next.body?.nodes ?? [];
  let pageIndex = pages.length - 1;
  let page = pages[pageIndex];
  if (!page || page.kind !== "page") {
    const pageId = makeId("page");
    page = { id: pageId, kind: "page", props: {}, children: [] };
    pages.push(page);
    pageIndex = pages.length - 1;
  }

  const nextPage: DocumentNode = {
    ...page,
    children: [...(page.children ?? []), section],
  };
  pages[pageIndex] = nextPage;

  return { doc: next, newIds: nextIds };
}

export function updateInlineSlot(doc: FluxDocument, slotId: string, update: InlineSlotUpdate): FluxDocument {
  const next: FluxDocument = {
    ...doc,
    body: {
      nodes: doc.body?.nodes ? doc.body.nodes.map((node) => updateNode(node, slotId, update)) : [],
    },
  };
  return next;
}

function updateNode(node: DocumentNode, slotId: string, update: InlineSlotUpdate): DocumentNode {
  if (node.id === slotId && node.kind === "inline_slot") {
    const props: Record<string, NodePropValue> = { ...(node.props ?? {}) };
    if (update.reserve !== undefined) props.reserve = { kind: "LiteralValue", value: update.reserve };
    if (update.fit !== undefined) props.fit = { kind: "LiteralValue", value: update.fit };
    const children = node.children?.map((child) => {
      if (child.kind !== "text") return child;
      const content = update.text ?? getLiteralString(child.props?.content) ?? "";
      return {
        ...child,
        props: { ...(child.props ?? {}), content: { kind: "LiteralValue", value: content } },
      };
    });
    return {
      ...node,
      props,
      refresh: update.refresh ?? node.refresh,
      children: children ?? node.children,
    };
  }

  if (!node.children?.length) return node;
  const nextChildren = node.children.map((child) => updateNode(child, slotId, update));
  return { ...node, children: nextChildren };
}
