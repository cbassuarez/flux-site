import { describe, expect, it } from "vitest";
import { buildChips, formatTitle, parseTitle } from "./normalize";

describe("parseTitle", () => {
  it("parses conventional titles with scope and breaking", () => {
    const parsed = parseTitle("feat(viewer)!: add docstep mode.", []);
    expect(parsed.type).toBe("feat");
    expect(parsed.scope).toBe("viewer");
    expect(parsed.breaking).toBe(true);
    expect(formatTitle(parsed)).toBe("Add docstep mode");
  });

  it("normalizes uppercase types and fallback formats", () => {
    const parsed = parseTitle("Fix: correct the renderer", []);
    expect(parsed.type).toBe("fix");
    expect(parsed.scope).toBe(null);
    expect(parsed.breaking).toBe(false);
    expect(formatTitle(parsed)).toBe("Correct the renderer");
  });

  it("falls back to change for unknown types", () => {
    const parsed = parseTitle("polish(ui): tighten padding", []);
    expect(parsed.type).toBe("change");
    expect(parsed.scope).toBe("ui");
  });

  it("marks breaking when breaking label is present", () => {
    const parsed = parseTitle("refactor: remove legacy path", ["breaking"]);
    expect(parsed.breaking).toBe(true);
  });
});

describe("buildChips", () => {
  it("dedupes and caps chips", () => {
    const parsed = parseTitle("feat(stable): update flags", []);
    const chips = buildChips(parsed, "stable");
    expect(chips).toEqual(["feat", "stable"]);
  });
});
