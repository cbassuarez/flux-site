import type { ChangelogAuthor, ChangelogChannel, ChangelogData, ChangelogItem, ChangelogSource } from "./types";

const CHANNELS: ChangelogChannel[] = ["stable", "canary", "nightly", "unknown"];

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
    typeof value.windowDays === "number" &&
    typeof value.label === "string" &&
    isStringArray(value.branches)
  );
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
  if (!CHANNELS.includes(value.channel as ChangelogChannel)) return false;
  if (!isStringArray(value.chips)) return false;
  if (typeof value.breaking !== "boolean") return false;
  return true;
}

export function parseChangelogData(value: unknown): ChangelogData | null {
  if (!isRecord(value)) return null;
  if (typeof value.generatedAt !== "string") return null;
  if (!isSource(value.source)) return null;
  if (!Array.isArray(value.items)) return null;
  if (!value.items.every((item) => isItem(item))) return null;
  return value as ChangelogData;
}
