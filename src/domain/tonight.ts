import type { Entry } from "./model";

export function recentFirst(a: Entry, b: Entry) {
  return (
    (b.lastWatchedDate ?? "").localeCompare(a.lastWatchedDate ?? "") ||
    (b.startedDate ?? "").localeCompare(a.startedDate ?? "") ||
    b.addedDate.localeCompare(a.addedDate) ||
    a.preferredTitle.localeCompare(b.preferredTitle)
  );
}
export function homeSpotlight(entries: Entry[]) {
  return (
    entries
      .filter((e) => ["Watching", "Rewatching"].includes(e.personalStatus))
      .sort(recentFirst)[0] ??
    entries
      .filter((e) => e.personalStatus === "Planning")
      .sort((a, b) => b.priority - a.priority || recentFirst(a, b))[0] ??
    null
  );
}
export interface TonightOptions {
  minutes: number | null;
  intent: "continue" | "start";
  genre: string;
  adult: boolean;
  eligibleIds?: ReadonlySet<number>;
}
export interface TonightCandidate {
  entry: Entry;
  episodes: number | null;
  minutes: number | null;
  reasons: string[];
}
export function evaluateTonight(entries: Entry[], options: TonightOptions) {
  const affinity = new Set(
    entries
      .filter(
        (e) =>
          (e.personalRating ?? 0) >= 8 ||
          ["Watching", "Rewatching"].includes(e.personalStatus),
      )
      .flatMap((e) => e.cachedMetadata.genres),
  );
  let unknownDuration = 0;
  const candidates: TonightCandidate[] = [];
  if (
    options.minutes !== null &&
    (!Number.isFinite(options.minutes) || options.minutes <= 0)
  )
    return { candidates, unknownDuration };
  for (const entry of entries) {
    const m = entry.cachedMetadata;
    if (options.eligibleIds && !options.eligibleIds.has(entry.anilistId))
      continue;
    if (
      !(options.intent === "start"
        ? entry.personalStatus === "Planning"
        : ["Watching", "Rewatching"].includes(entry.personalStatus))
    )
      continue;
    if (
      (!options.adult && m.isAdult) ||
      (options.genre && !m.genres.includes(options.genre))
    )
      continue;
    const remaining =
      m.format === "MOVIE"
        ? Math.max(0, 1 - entry.watchedEpisodes)
        : entry.totalEpisodes === null
          ? Infinity
          : Math.max(0, entry.totalEpisodes - entry.watchedEpisodes);
    if (!remaining) continue;
    const duration = m.duration && m.duration > 0 ? m.duration : null;
    if (options.minutes !== null && duration === null) {
      unknownDuration++;
      continue;
    }
    const episodes =
      options.minutes !== null && duration !== null
        ? Math.min(remaining, Math.floor(options.minutes / duration))
        : null;
    if (episodes === 0) continue;
    const reasons: string[] = [];
    if (episodes !== null)
      reasons.push(
        m.format === "MOVIE"
          ? `The full movie fits in ${options.minutes} minutes`
          : `${episodes} episode${episodes === 1 ? "" : "s"} fit in ${options.minutes} minutes`,
      );
    if (entry.priority > 0)
      reasons.push(
        `You marked it ${["Normal", "Soon", "Next up", "Top priority"][entry.priority]}`,
      );
    if (options.intent === "continue" && entry.lastWatchedDate)
      reasons.push(`Last watched ${entry.lastWatchedDate.slice(0, 10)}`);
    candidates.push({
      entry,
      episodes,
      minutes:
        episodes !== null && duration !== null ? episodes * duration : null,
      reasons,
    });
  }
  const score = (e: Entry) =>
    e.cachedMetadata.genres.filter((g) => affinity.has(g)).length;
  candidates.sort(
    (a, b) =>
      (options.intent === "start"
        ? b.entry.priority - a.entry.priority
        : (
            b.entry.lastWatchedDate ??
            b.entry.startedDate ??
            b.entry.addedDate
          ).localeCompare(
            a.entry.lastWatchedDate ?? a.entry.startedDate ?? a.entry.addedDate,
          )) ||
      score(b.entry) - score(a.entry) ||
      a.entry.preferredTitle.localeCompare(b.entry.preferredTitle),
  );
  return { candidates: candidates.slice(0, 3), unknownDuration };
}
