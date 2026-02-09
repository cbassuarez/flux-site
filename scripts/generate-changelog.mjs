import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OWNER = "flux-lang";
const REPO = "flux";
const WINDOW_DAYS = 365;
const LABEL = "changelog";
const MAX_CONCURRENCY = 5;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN is required to generate changelog.json");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "User-Agent": "flux-site-changelog",
  Accept: "application/vnd.github+json",
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

const CHANNEL_MAP = {
  main: "stable",
  canary: "canary",
  nightly: "nightly",
};

const FIELD_REGEX = /^\s*release notes?(?:\s*\(1 line\))?:\s*(.*)$/i;
const HEADING_REGEX = /^(#{2,4})\s+release notes?\s*$/i;
const CHECKBOX_REGEX = /^\s*[-*]\s*\[[ xX]\]\s*/;
const LIST_MARKER_REGEX = /^\s*(?:[-*]|\d+\.)\s*/;

const normalizeType = (type) => {
  const lowered = type.toLowerCase();
  return KNOWN_TYPES.has(lowered) ? lowered : "change";
};

const normalizeSubject = (subject) => {
  const trimmed = subject.trim().replace(/\.$/, "");
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
};

const parseTitle = (rawTitle, labels) => {
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
};

const formatTitle = (parsed) => parsed.subject || "Untitled";

const buildChips = (parsed, channel) => {
  const chips = [parsed.type];
  if (parsed.scope) chips.push(parsed.scope);
  if (channel) chips.push(channel);
  return Array.from(new Set(chips.filter(Boolean))).slice(0, 3);
};

const normalizeSummary = (input) => {
  const withoutMarker = input.replace(LIST_MARKER_REGEX, "").trim();
  const noPeriod = withoutMarker.replace(/\.$/, "");
  if (!noPeriod) return null;
  return noPeriod.length > 160 ? `${noPeriod.slice(0, 157).trim()}...` : noPeriod;
};

const firstMeaningfulLine = (lines) => {
  for (const line of lines) {
    if (!line.trim()) continue;
    if (CHECKBOX_REGEX.test(line)) continue;
    const normalized = normalizeSummary(line);
    if (normalized) return normalized;
  }
  return null;
};

const extractReleaseNote = (body) => {
  if (!body) return null;
  const lines = body.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(FIELD_REGEX);
    if (!match) continue;
    const inline = normalizeSummary(match[1] ?? "");
    if (inline) return inline;
    return firstMeaningfulLine(lines.slice(i + 1));
  }

  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(HEADING_REGEX);
    if (!headingMatch) continue;
    const headingLevel = headingMatch[1].length;
    const sectionLines = [];
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

  let paragraph = [];
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
    if (CHECKBOX_REGEX.test(line)) continue;
    paragraph.push(line.trim());
  }

  return flushParagraph();
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers });
  if (response.status === 404) return { status: 404, data: null };
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }
  return { status: response.status, data: await response.json() };
};

const branchExists = async (branch) => {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/branches/${branch}`;
  const { status } = await fetchJson(url);
  if (status === 404) return false;
  return true;
};

const getBranches = async () => {
  const branches = ["main", "canary", "nightly"];
  const results = [];
  for (const branch of branches) {
    if (branch === "main") {
      results.push(branch);
      continue;
    }
    if (await branchExists(branch)) results.push(branch);
  }
  return results;
};

const searchIssues = async (branch, sinceDate) => {
  const results = [];
  let page = 1;
  while (true) {
    const url = new URL("https://api.github.com/search/issues");
    url.searchParams.set(
      "q",
      `repo:${OWNER}/${REPO} is:pr is:merged label:${LABEL} base:${branch} merged:>=${sinceDate}`
    );
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const { data } = await fetchJson(url);
    const items = data?.items ?? [];
    results.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return results;
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
};

const getPullRequest = async (number) => {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/pulls/${number}`;
  const { data } = await fetchJson(url);
  return data;
};

const main = async () => {
  const branches = await getBranches();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().slice(0, 10);

  const searchResults = [];
  for (const branch of branches) {
    const items = await searchIssues(branch, sinceDate);
    searchResults.push(...items);
  }

  const items = await mapWithConcurrency(searchResults, MAX_CONCURRENCY, async (issue) => {
    const pr = await getPullRequest(issue.number);
    const labels = (pr.labels ?? []).map((label) => label.name);
    const parsed = parseTitle(pr.title ?? issue.title ?? "", labels);
    const channel = CHANNEL_MAP[pr.base?.ref] ?? "unknown";
    const mergedAt = pr.merged_at ?? issue.closed_at ?? new Date().toISOString();

    return {
      id: pr.number,
      title: formatTitle(parsed),
      rawTitle: pr.title ?? issue.title ?? "",
      summary: extractReleaseNote(pr.body ?? ""),
      mergedAt,
      url: pr.html_url ?? issue.html_url,
      diffUrl: `${pr.html_url ?? issue.html_url}/files`,
      author: pr.user ? { login: pr.user.login, url: pr.user.html_url } : null,
      labels,
      channel,
      chips: buildChips(parsed, channel),
      breaking: parsed.breaking,
    };
  });

  const sortedItems = items
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = new Date(a.mergedAt).getTime();
      const bTime = new Date(b.mergedAt).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      repo: `${OWNER}/${REPO}`,
      branches,
      windowDays: WINDOW_DAYS,
      label: LABEL,
    },
    items: sortedItems,
  };

  const filePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/changelog.json");
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${sortedItems.length} changelog items to ${filePath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
