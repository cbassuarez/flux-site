import type { ChangelogChannel } from "./types";

export type ParsedTitle = {
  type: string;
  scope: string | null;
  subject: string;
  breaking: boolean;
};

const KNOWN_TYPES = new Set([
  "feat",
  "fix",
  "chore",
  "docs",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "style",
  "revert",
  "change",
]);

function normalizeType(type: string) {
  const lowered = type.toLowerCase();
  return KNOWN_TYPES.has(lowered) ? lowered : "change";
}

function normalizeSubject(subject: string) {
  const trimmed = subject.trim().replace(/\.$/, "");
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

export function parseTitle(rawTitle: string, labels: string[] = []): ParsedTitle {
  const normalized = rawTitle.trim();
  const match = normalized.match(/^([A-Za-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  const fallbackMatch = normalized.match(/^([A-Za-z]+)(!)?:\s*(.+)$/);
  const hasBreakingLabel = labels.map((label) => label.toLowerCase()).includes("breaking");

  if (match) {
    const [, rawType, rawScope, bang, subject] = match;
    return {
      type: normalizeType(rawType),
      scope: rawScope ? rawScope.toLowerCase() : null,
      subject: normalizeSubject(subject),
      breaking: Boolean(bang) || hasBreakingLabel,
    };
  }

  if (fallbackMatch) {
    const [, rawType, bang, subject] = fallbackMatch;
    return {
      type: normalizeType(rawType),
      scope: null,
      subject: normalizeSubject(subject),
      breaking: Boolean(bang) || hasBreakingLabel,
    };
  }

  return {
    type: "change",
    scope: null,
    subject: normalizeSubject(normalized),
    breaking: hasBreakingLabel,
  };
}

export function formatTitle(parsed: ParsedTitle) {
  return parsed.subject || "Untitled";
}

export function buildChips(parsed: ParsedTitle, channel: ChangelogChannel) {
  const chips = [parsed.type];
  if (parsed.scope) chips.push(parsed.scope);
  if (channel) chips.push(channel);
  const deduped = Array.from(new Set(chips.filter(Boolean)));
  return deduped.slice(0, 3);
}
