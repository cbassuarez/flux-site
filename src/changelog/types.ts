export type ChangelogChannel = "stable" | "canary" | "nightly" | "unknown";

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
  channel: ChangelogChannel;
  chips: string[];
  breaking: boolean;
};

export type ChangelogSource = {
  repo: string;
  branches: string[];
  windowDays: number;
  label: string;
};

export type ChangelogData = {
  generatedAt: string;
  source: ChangelogSource;
  items: ChangelogItem[];
};
