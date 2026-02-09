import { describe, expect, it } from "vitest";
import { deriveChips, normalizeTitle } from "./normalize";

describe("normalizeTitle", () => {
  it("parses conventional titles with scope", () => {
    const parsed = normalizeTitle("feat(viewer): add docstep mode. (#123)");
    expect(parsed.title).toBe("add docstep mode.");
    expect(parsed.typeChip).toBe("feat");
    expect(parsed.scopeChip).toBe("viewer");
  });

  it("normalizes uppercase prefixes", () => {
    const parsed = normalizeTitle("Fix: correct the renderer");
    expect(parsed.typeChip).toBe("fix");
    expect(parsed.title).toBe("correct the renderer");
  });

  it("infers type when missing", () => {
    const parsed = normalizeTitle("Add new viewer layout");
    expect(parsed.typeChip).toBe("feat");
  });
});

describe("deriveChips", () => {
  it("builds type, scope, and channel chips", () => {
    const normalized = normalizeTitle("feat(cli): update flags");
    const chips = deriveChips({
      title: normalized.title,
      typeChip: normalized.typeChip,
      scopeChip: normalized.scopeChip,
      channel: "stable",
    });
    expect(chips).toEqual([
      { kind: "type", value: "feat" },
      { kind: "scope", value: "cli" },
      { kind: "channel", value: "stable" },
    ]);
  });
});
