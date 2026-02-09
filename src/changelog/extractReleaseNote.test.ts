import { describe, expect, it } from "vitest";
import { extractReleaseNote } from "./extractReleaseNote";

describe("extractReleaseNote", () => {
  it("prefers explicit release note fields", () => {
    const body = "Release note: Adds docstep playback.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback.");
  });

  it("uses heading-based release notes", () => {
    const body = "## Release notes\n\nAdds docstep playback.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback.");
  });

  it("falls back to the first paragraph", () => {
    const body = "Adds docstep playback for viewer.\n\nMore details here.";
    expect(extractReleaseNote(body)).toBe("Adds docstep playback for viewer.");
  });
});
