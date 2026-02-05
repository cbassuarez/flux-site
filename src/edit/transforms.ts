import type { TransformRequest } from "./api";

export type AddFigureArgs = {
  bankName: string;
  tags?: string[];
  caption?: string;
  reserve?: string;
  fit?: string;
};

function cleanString(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function buildAddSectionTransform(): TransformRequest {
  return { op: "addSection", args: {} };
}

export function buildAddFigureTransform(args: AddFigureArgs): TransformRequest {
  const tags = (args.tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return {
    op: "addFigure",
    args: {
      bankName: cleanString(args.bankName),
      tags,
      caption: cleanString(args.caption),
      reserve: cleanString(args.reserve),
      fit: cleanString(args.fit)
    }
  };
}
