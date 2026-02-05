import { describe, expect, it } from "vitest";
import { buildAddFigureTransform, buildAddSectionTransform } from "./transforms";

describe("transform builders", () => {
  it("builds addSection transform", () => {
    expect(buildAddSectionTransform()).toEqual({ op: "addSection", args: {} });
  });

  it("builds addFigure transform with cleaned args", () => {
    const transform = buildAddFigureTransform({
      bankName: "  hero-bank  ",
      tags: [" cover ", "", "poster"],
      caption: "  ",
      reserve: "640x360",
      fit: "contain"
    });

    expect(transform.op).toBe("addFigure");
    expect(transform.args).toEqual({
      bankName: "hero-bank",
      tags: ["cover", "poster"],
      caption: undefined,
      reserve: "640x360",
      fit: "contain"
    });
  });
});
