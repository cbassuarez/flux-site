import { describe, expect, it } from "vitest";
import { extractReleaseNote } from "./extractReleaseNote";

describe("extractReleaseNote", () => {
  it("prefers explicit release note fields", () => {
    const body = "Release note: Adds docstep playback.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback");
  });

  it("reads release note fields on following lines", () => {
    const body = "Release note:\n- Adds docstep playback.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback");
  });

  it("reads heading-based release notes", () => {
    const body = "## Release notes\n\n- Adds docstep playback.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback");
  });

  it("falls back to the first paragraph", () => {
    const body = "Adds docstep playback for viewer.\n\nMore details here.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback for viewer");
  });

  it("skips checkbox-only blocks", () => {
    const body = "## Release note\n- [ ] TODO\n\nFirst paragraph release note.";
    expect(extractReleaseNote(body)).toBe("First paragraph release note");
  });
});
