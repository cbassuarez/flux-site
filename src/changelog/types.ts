export type ChangelogChip = {
  kind: "type" | "scope" | "channel";
  value: string;
};

export type ChangelogAuthor = {
  login: string;
  url: string;
};

export type ChangelogItem = {
  id: number;
  title: string;
  rawTitle: string;
  summary: string | null;
  mergedAt: string;
  url: string;
  diffUrl: string;
  author: ChangelogAuthor | null;
  labels: string[];
  chips: ChangelogChip[];
};

export type ChangelogSource = {
  repo: string;
  base: string;
  windowDays: number;
};

export type ChangelogPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ChangelogData = {
  generatedAt: string;
  source: ChangelogSource;
  pageInfo: ChangelogPageInfo;
  items: ChangelogItem[];
};
