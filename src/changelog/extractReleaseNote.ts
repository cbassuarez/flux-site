const FIELD_REGEX = /^\s*release note\s*:\s*(.*)$/i;
const HEADING_REGEX = /^(#{2,4})\s+release notes?\s*$/i;
const LINK_REGEX = /\[([^\]]+)\]\([^\)]+\)/g;
const STYLE_REGEX = /[`*_]/g;
const LIST_MARKER_REGEX = /^\s*(?:[-*]|\d+\.)\s+/;

function normalizeLine(input: string) {
  const withoutLinks = input.replace(LINK_REGEX, "$1");
  const withoutListMarker = withoutLinks.replace(LIST_MARKER_REGEX, "");
  const withoutStyle = withoutListMarker.replace(STYLE_REGEX, "");
  const flattened = withoutStyle.replace(/\s+/g, " ").trim();
  return flattened.length ? flattened : null;
}

function firstParagraph(lines: string[]) {
  const paragraph: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(line.trim());
  }
  if (!paragraph.length) return null;
  return normalizeLine(paragraph.join(" "));
}

export function extractReleaseNote(body: string | null | undefined) {
  if (!body) return null;
  const lines = body.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(FIELD_REGEX);
    if (!match) continue;
    return normalizeLine(match[1] ?? "");
  }

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(HEADING_REGEX);
    if (!match) continue;
    const headingLevel = match[1].length;
    const sectionLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (headingMatch && headingMatch[1].length <= headingLevel) {
        break;
      }
      sectionLines.push(line);
    }
    const paragraph = firstParagraph(sectionLines);
    if (paragraph) return paragraph;
  }

  return firstParagraph(lines);
}
