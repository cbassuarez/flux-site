import type { ChangelogChannel, ChangelogItem } from "./types";

export type ChangelogFilters = {
  windowDays: number;
  channel: ChangelogChannel;
  now: number;
};

export function filterChangelogItems(items: ChangelogItem[], filters: ChangelogFilters) {
  const { windowDays, channel, now } = filters;
  const minTimestamp = now - windowDays * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const mergedTime = new Date(item.mergedAt).getTime();
    if (Number.isNaN(mergedTime) || mergedTime < minTimestamp) return false;
    if (channel && item.channel !== channel) return false;
    return true;
  });
}
