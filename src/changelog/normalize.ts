import type { ChangelogChip } from "./types";

const TYPE_INFERENCE = [
  { regex: /^(fix|fixed|hotfix)\b/i, value: "fix" },
  { regex: /^(add|adds|introduce|introduces|support|supports|implement|implements)\b/i, value: "feat" },
];

const SCOPE_TOKENS = ["viewer", "cli", "core", "docs", "site"];

function normalizeType(type: string) {
  return type.trim().toLowerCase();
}

function cleanTitle(rawTitle: string) {
  return rawTitle.trim().replace(/\s*\(#\d+\)\s*$/, "");
}

function inferType(title: string) {
  for (const option of TYPE_INFERENCE) {
    if (option.regex.test(title)) return option.value;
  }
  return "chore";
}

function inferScope(title: string) {
  const scopeMatch = title.match(/\(([^)]+)\)/);
  if (scopeMatch?.[1]) return scopeMatch[1].trim().toLowerCase();
  const lower = title.toLowerCase();
  return SCOPE_TOKENS.find((token) => new RegExp(`\\b${token}\\b`, "i").test(lower)) ?? null;
}

export function normalizeTitle(rawTitle: string) {
  const trimmed = cleanTitle(rawTitle);
  const conventionalMatch = trimmed.match(/^([A-Za-z]+)(?:\(([^)]+)\))?:\s*(.+)$/);
  if (conventionalMatch) {
    const [, rawType, rawScope, subject] = conventionalMatch;
    const typeChip = normalizeType(rawType);
    const scopeChip = rawScope ? rawScope.trim().toLowerCase() : undefined;
    return {
      title: subject.trim(),
      typeChip,
      scopeChip,
    };
  }

  const fallbackMatch = trimmed.match(/^([A-Za-z]+):\s*(.+)$/);
  if (fallbackMatch) {
    const [, rawType, subject] = fallbackMatch;
    return {
      title: subject.trim(),
      typeChip: normalizeType(rawType),
      scopeChip: undefined,
    };
  }

  const inferredType = inferType(trimmed);
  const inferredScope = inferScope(trimmed) ?? undefined;
  return {
    title: trimmed,
    typeChip: inferredType,
    scopeChip: inferredScope,
  };
}

export function deriveChips({
  title,
  typeChip,
  scopeChip,
  channel,
}: {
  title: string;
  typeChip?: string;
  scopeChip?: string;
  channel: string;
}): ChangelogChip[] {
  const type = typeChip ?? inferType(title);
  const scope = scopeChip ?? inferScope(title) ?? undefined;
  const chips: ChangelogChip[] = [{ kind: "type", value: type }];
  if (scope) chips.push({ kind: "scope", value: scope });
  chips.push({ kind: "channel", value: channel });
  return chips;
}
