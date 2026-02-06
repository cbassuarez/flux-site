import { test, expect, type Page } from "@playwright/test";

type DocNode = {
  id: string;
  kind: string;
  props?: Record<string, any>;
  children?: DocNode[];
  refresh?: any;
  transition?: any;
};

type FluxDoc = {
  meta: { version: string };
  state: { params: any[] };
  grids: any[];
  rules: any[];
  body: { nodes: DocNode[] };
};

const DEFAULT_ASSETS = [
  { id: "asset-1", name: "Asset One", kind: "image", path: "/assets/one.png", tags: ["hero", "swap"] },
  { id: "asset-2", name: "Asset Two", kind: "image", path: "/assets/two.png", tags: ["alt", "swap"] },
];

test.describe("Editor editing", () => {
  test("edit paragraph text updates preview", async ({ page }) => {
    const { consoleErrors } = await setupEditorRoutes(page);
    await page.goto("/edit/");

    const frame = page.frameLocator("iframe[title=\"Flux preview\"]");
    await expect(frame.locator("[data-flux-id=\"text1\"]")).toBeVisible();
    await frame.locator("[data-flux-id=\"text1\"]").click();
    await page.getByRole("button", { name: "Edit Text" }).click();

    const prose = page.locator(".ProseMirror");
    await prose.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Updated paragraph");

    await expect(frame.locator("[data-flux-id=\"text1\"]")).toContainText("Updated paragraph");
    expect(consoleErrors).toEqual([]);
  });

  test("edit figure caption updates preview", async ({ page }) => {
    const { consoleErrors } = await setupEditorRoutes(page);
    await page.goto("/edit/");

    const frame = page.frameLocator("iframe[title=\"Flux preview\"]");
    await expect(frame.locator("[data-flux-id=\"figure1\"]")).toBeVisible();
    await frame.locator("[data-flux-id=\"figure1\"]").click();

    const captionSection = page
      .locator(".inspector-section")
      .filter({ has: page.locator(".section-title", { hasText: "Caption" }) });
    const captionInput = captionSection.locator("input");
    await captionInput.fill("New caption text");
    await captionInput.press("Enter");

    await expect(frame.locator("[data-flux-id=\"caption1\"]")).toContainText("New caption text");
    expect(consoleErrors).toEqual([]);
  });

  test("edit slot variants updates current value and preview", async ({ page }) => {
    const { consoleErrors, getDoc } = await setupEditorRoutes(page);
    await page.goto("/edit/");

    const frame = page.frameLocator("iframe[title=\"Flux preview\"]");
    await expect(frame.locator("[data-flux-id=\"slot1\"]")).toBeVisible();
    await frame.locator("[data-flux-id=\"slot1\"]").click();

    const variantInput = page.locator(".variant-row input").first();
    await variantInput.fill("Delta");
    await page.waitForTimeout(260);

    const currentValue = page.locator(".slot-current-value");
    await expect(currentValue).toContainText("Delta");

    const moveDown = page.locator(".variant-row").first().locator("button").nth(1);
    await moveDown.click();
    await page.waitForTimeout(260);

    const slotNode = findNode(getDoc(), "slot1");
    expect(slotNode?.props?.generator?.values?.[0]).toBe("Beta");
    expect(slotNode?.props?.generator?.values?.[1]).toBe("Delta");

    const docstepPlus = page.locator(".transport-stepper button").nth(1);
    const before = (await currentValue.textContent())?.trim() ?? "";
    await docstepPlus.click();
    await expect(currentValue).not.toHaveText(before);

    const updatedValue = (await currentValue.textContent())?.trim() ?? "";
    await expect(frame.locator("[data-flux-id=\"slot1\"]")).toContainText(updatedValue);
    expect(consoleErrors).toEqual([]);
  });

  test("refresh + transition controls drive playback swaps", async ({ page }) => {
    const { consoleErrors } = await setupEditorRoutes(page);
    await page.goto("/edit/");

    const frame = page.frameLocator("iframe[title=\"Flux preview\"]");
    await expect(frame.locator("[data-flux-id=\"slot2\"]")).toBeVisible();
    await frame.locator("[data-flux-id=\"slot2\"]").click();

    const refreshPanel = page.locator(".slot-panel").filter({ has: page.locator(".panel-title", { hasText: "Refresh" }) });
    await refreshPanel.locator("select").first().selectOption("every");
    await refreshPanel.locator("input").first().fill("1.2s");
    await refreshPanel.getByRole("button", { name: "Apply" }).click();

    const transitionPanel = page
      .locator(".slot-panel")
      .filter({ has: page.locator(".panel-title", { hasText: "Transition" }) });
    await transitionPanel.locator("select").first().selectOption("fade");
    await transitionPanel.locator("input").first().fill("220");
    await transitionPanel.locator("select").nth(1).selectOption("inOut");

    await page.locator(".transport-tab", { hasText: "Playback" }).click();

    const slotEl = frame.locator("[data-flux-id=\"slot2\"]");
    const before = (await slotEl.textContent()) ?? "";
    await page.waitForTimeout(1400);
    await expect(slotEl).not.toHaveText(before);
    expect(consoleErrors).toEqual([]);
  });
});

async function setupEditorRoutes(page: Page) {
  let doc = createDoc();
  let revision = 1;
  let source = "Test document";
  const runtime = { seed: 7, time: 0, docstep: 0 };

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "warning" || msg.type() === "error") {
      if (text.toLowerCase().includes("maximum update depth")) {
        consoleErrors.push(text);
      }
    }
  });
  page.on("pageerror", (error) => {
    if (String(error).toLowerCase().includes("maximum update depth")) {
      consoleErrors.push(String(error));
    }
  });

  await page.route("**/api/edit/state**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        title: "Test Doc",
        path: "tests/test.flux",
        previewPath: "/preview",
        assets: DEFAULT_ASSETS,
        runtime,
        doc,
      }),
    });
  });

  await page.route("**/api/edit/source**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        source,
        revision,
        lastValidRevision: revision,
        docPath: "tests/test.flux",
      }),
    });
  });

  await page.route("**/api/edit/transform**", async (route) => {
    const payload = route.request().postData() ?? "{}";
    const request = JSON.parse(payload);
    applyTransform(doc, request);
    revision += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        source,
        revision,
        previewPath: "/preview",
        assets: DEFAULT_ASSETS,
        runtime,
        doc,
      }),
    });
  });

  await page.route("**/preview**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: renderPreview(doc),
    });
  });

  return { consoleErrors, getDoc: () => doc };
}

function createDoc(): FluxDoc {
  return {
    meta: { version: "0.1.0" },
    state: { params: [] },
    grids: [],
    rules: [],
    body: {
      nodes: [
        {
          id: "page1",
          kind: "page",
          props: {},
          children: [
            {
              id: "section1",
              kind: "section",
              props: {},
              children: [
                {
                  id: "text1",
                  kind: "text",
                  props: { content: { kind: "LiteralValue", value: "Hello world" } },
                  children: [],
                },
                {
                  id: "textInline",
                  kind: "text",
                  props: { content: { kind: "LiteralValue", value: "Inline " } },
                  children: [
                    {
                      id: "inlineSlot1",
                      kind: "inline_slot",
                      props: {
                        generator: { kind: "choose", values: ["Quick", "Adaptive", "Bold"] },
                        reserve: { kind: "LiteralValue", value: "fixedWidth(8, ch)" },
                        fit: { kind: "LiteralValue", value: "ellipsis" },
                      },
                      refresh: { kind: "docstep" },
                      transition: { kind: "fade", durationMs: 180, ease: "inOut" },
                      children: [
                        {
                          id: "inlineSlotText1",
                          kind: "text",
                          props: { content: { kind: "LiteralValue", value: "Quick" } },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "figure1",
                  kind: "figure",
                  props: {},
                  children: [
                    {
                      id: "caption1",
                      kind: "text",
                      props: {
                        role: { kind: "LiteralValue", value: "caption" },
                        content: { kind: "LiteralValue", value: "Initial caption" },
                      },
                      children: [],
                    },
                  ],
                },
                {
                  id: "slot1",
                  kind: "slot",
                  props: {
                    generator: { kind: "cycle", values: ["Alpha", "Beta", "Gamma"] },
                    reserve: { kind: "LiteralValue", value: "fixedWidth(8, ch)" },
                    fit: { kind: "LiteralValue", value: "ellipsis" },
                  },
                  refresh: { kind: "docstep" },
                  transition: { kind: "fade", durationMs: 200, ease: "inOut" },
                  children: [
                    {
                      id: "slotText1",
                      kind: "text",
                      props: { content: { kind: "LiteralValue", value: "Alpha" } },
                      children: [],
                    },
                  ],
                },
                {
                  id: "slot2",
                  kind: "slot",
                  props: {
                    generator: { kind: "assetsPick", tags: ["swap"] },
                    reserve: { kind: "LiteralValue", value: "fixedWidth(12, ch)" },
                    fit: { kind: "LiteralValue", value: "scaleDown" },
                  },
                  refresh: { kind: "every", amount: 1, unit: "s" },
                  transition: { kind: "wipe", direction: "right", durationMs: 220, ease: "inOut" },
                  children: [
                    {
                      id: "slotText2",
                      kind: "text",
                      props: { content: { kind: "LiteralValue", value: "Asset" } },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function renderPreview(doc: FluxDoc) {
  const text1 = getNodeText(doc, "text1");
  const textInline = getNodeText(doc, "textInline");
  const caption1 = getNodeText(doc, "caption1");
  return `
    <html>
      <body>
        <div data-flux-id="text1" data-flux-kind="text">${escapeHtml(text1)}</div>
        <div data-flux-id="textInline" data-flux-kind="text">
          ${escapeHtml(textInline)}
          <span data-flux-id="inlineSlot1" data-flux-kind="inline_slot">slot</span>
        </div>
        <figure data-flux-id="figure1" data-flux-kind="figure">
          <figcaption data-flux-id="caption1" data-flux-kind="text">${escapeHtml(caption1)}</figcaption>
        </figure>
        <span data-flux-id="slot1" data-flux-kind="slot">slot</span>
        <div data-flux-id="slot2" data-flux-kind="slot">slot</div>
      </body>
    </html>
  `;
}

function applyTransform(doc: FluxDoc, request: { op: string; args?: Record<string, any> }) {
  const args = request.args ?? {};
  if (request.op === "setTextNodeContent") {
    const id = args.id ?? args.nodeId;
    const text = typeof args.text === "string" ? args.text : extractTextFromRichText(args.richText);
    const node = findNode(doc, id);
    if (node) {
      node.props = { ...(node.props ?? {}), content: { kind: "LiteralValue", value: text } };
      node.children = [];
    }
  }

  if (request.op === "setSlotGenerator") {
    const id = args.id ?? args.slotId;
    const node = findNode(doc, id);
    if (node) {
      node.props = { ...(node.props ?? {}), generator: args.generator };
    }
  }

  if (request.op === "setSlotProps") {
    const id = args.id ?? args.slotId;
    const node = findNode(doc, id);
    if (node) {
      node.props = {
        ...(node.props ?? {}),
        ...(args.reserve ? { reserve: { kind: "LiteralValue", value: args.reserve } } : {}),
        ...(args.fit ? { fit: { kind: "LiteralValue", value: args.fit } } : {}),
      };
      if (args.refresh) node.refresh = args.refresh;
      if (args.transition) node.transition = args.transition;
    }
  }

  if (request.op === "setNodeProps") {
    const id = args.id ?? args.nodeId;
    const node = findNode(doc, id);
    if (node) {
      node.props = { ...(node.props ?? {}), ...(args.props ?? {}) };
    }
  }
}

function findNode(doc: FluxDoc, id: string): DocNode | null {
  const visit = (node: DocNode): DocNode | null => {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  for (const node of doc.body.nodes) {
    const found = visit(node);
    if (found) return found;
  }
  return null;
}

function getNodeText(doc: FluxDoc, id: string): string {
  const node = findNode(doc, id);
  const content = node?.props?.content;
  if (content?.kind === "LiteralValue") return String(content.value ?? "");
  return "";
}

function extractTextFromRichText(json: any): string {
  let text = "";
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === "text") {
      text += node.text ?? "";
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  };
  walk(json);
  return text;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
