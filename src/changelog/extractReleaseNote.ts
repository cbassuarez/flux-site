const FIELD_REGEX = /^\s*release notes?(?:\s*\(1 line\))?:\s*(.*)$/i;
const HEADING_REGEX = /^(#{2,4})\s+release notes?\s*$/i;
const CHECKBOX_REGEX = /^\s*[-*]\s*\[[ xX]\]\s*/;
const LIST_MARKER_REGEX = /^\s*(?:[-*]|\d+\.)\s*/;

function normalizeSummary(input: string) {
  const withoutMarker = input.replace(LIST_MARKER_REGEX, "").trim();
  const noPeriod = withoutMarker.replace(/\.$/, "");
  if (!noPeriod) return null;
  return noPeriod.length > 160 ? `${noPeriod.slice(0, 157).trim()}...` : noPeriod;
}

function firstMeaningfulLine(lines: string[]) {
  for (const line of lines) {
    if (!line.trim()) continue;
    if (CHECKBOX_REGEX.test(line)) continue;
    const normalized = normalizeSummary(line);
    if (normalized) return normalized;
  }
  return null;
}

export function extractReleaseNote(body: string | null | undefined) {
  if (!body) return null;
  const lines = body.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(FIELD_REGEX);
    if (!match) continue;
    const inline = normalizeSummary(match[1] ?? "");
    if (inline) return inline;
    const nextLines = lines.slice(i + 1);
    return firstMeaningfulLine(nextLines);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(HEADING_REGEX);
    if (!headingMatch) continue;
    const headingLevel = headingMatch[1].length;
    const sectionLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      const nextHeading = line.match(/^(#{1,6})\s+/);
      if (nextHeading && nextHeading[1].length <= headingLevel) {
        break;
      }
      sectionLines.push(line);
    }
    const found = firstMeaningfulLine(sectionLines);
    if (found) return found;
  }

  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return null;
    const joined = paragraph.join(" ").trim();
    paragraph = [];
    return normalizeSummary(joined);
  };

  for (const line of lines) {
    if (!line.trim()) {
      const candidate = flushParagraph();
      if (candidate) return candidate;
      continue;
    }
    if (HEADING_REGEX.test(line) || /^#{1,6}\s+/.test(line)) {
      const candidate = flushParagraph();
      if (candidate) return candidate;
      continue;
    }
    if (CHECKBOX_REGEX.test(line)) {
      continue;
    }
    paragraph.push(line.trim());
  }

  return flushParagraph();
}
