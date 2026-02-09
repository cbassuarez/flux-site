import type {
  ChangelogAuthor,
  ChangelogChip,
  ChangelogData,
  ChangelogItem,
  ChangelogPageInfo,
  ChangelogSource,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAuthor(value: unknown): value is ChangelogAuthor {
  if (!isRecord(value)) return false;
  return typeof value.login === "string" && typeof value.url === "string";
}

function isSource(value: unknown): value is ChangelogSource {
  if (!isRecord(value)) return false;
  return (
    typeof value.repo === "string" &&
    typeof value.base === "string" &&
    typeof value.windowDays === "number"
  );
}

function isPageInfo(value: unknown): value is ChangelogPageInfo {
  if (!isRecord(value)) return false;
  if (typeof value.hasNextPage !== "boolean") return false;
  if (value.endCursor !== null && typeof value.endCursor !== "string") return false;
  return true;
}

function isChip(value: unknown): value is ChangelogChip {
  if (!isRecord(value)) return false;
  if (value.kind !== "type" && value.kind !== "scope" && value.kind !== "channel") return false;
  return typeof value.value === "string";
}

function isItem(value: unknown): value is ChangelogItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "number") return false;
  if (typeof value.title !== "string" || typeof value.rawTitle !== "string") return false;
  if (value.summary !== null && typeof value.summary !== "string") return false;
  if (typeof value.mergedAt !== "string") return false;
  if (typeof value.url !== "string" || typeof value.diffUrl !== "string") return false;
  if (value.author !== null && !isAuthor(value.author)) return false;
  if (!isStringArray(value.labels)) return false;
  if (!Array.isArray(value.chips) || !value.chips.every((chip) => isChip(chip))) return false;
  return true;
}

export function parseChangelogData(value: unknown): ChangelogData | null {
  if (!isRecord(value)) return null;
  if (typeof value.generatedAt !== "string") return null;
  if (!isSource(value.source)) return null;
  if (!isPageInfo(value.pageInfo)) return null;
  if (!Array.isArray(value.items)) return null;
  if (!value.items.every((item) => isItem(item))) return null;
  return value as ChangelogData;
}
