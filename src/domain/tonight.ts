import type { Entry } from "./model";

export function recentFirst(a: Entry, b: Entry) {
  return (
    (b.lastWatchedDate ?? "").localeCompare(a.lastWatchedDate ?? "") ||
    (b.startedDate ?? "").localeCompare(a.startedDate ?? "") ||
    b.addedDate.localeCompare(a.addedDate) ||
    a.preferredTitle.localeCompare(b.preferredTitle)
  );
}
// Never extrapolate a weekly schedule: only count episodes confirmed by metadata.
export function availableEpisodes(entry: Entry, now = Date.now()) {
  const m = entry.cachedMetadata;
  const total = m.format === "MOVIE" ? 1 : (entry.totalEpisodes ?? Infinity);
  if (m.status === "FINISHED")
    return Math.max(0, total - entry.watchedEpisodes);
  const air = m.nextAiringEpisode;
  if (air) {
    const aired = air.episode - (air.airingAt * 1000 > now ? 1 : 0);
    return Math.max(0, Math.min(total, aired) - entry.watchedEpisodes);
  }
  if (
    m.status === "NOT_YET_RELEASED" ||
    m.status === "RELEASING" ||
    m.status === "HIATUS"
  )
    return 0;
  return Math.max(0, total - entry.watchedEpisodes);
}
export function homeSpotlight(
  entries: Entry[],
  now = Date.now(),
  previousId?: string,
) {
  const watching = entries
    .filter(
      (e) =>
        ["Watching", "Rewatching"].includes(e.personalStatus) &&
        availableEpisodes(e, now) > 0,
    )
    .sort(recentFirst);
  const planned = entries
    .filter(
      (e) => e.personalStatus === "Planning" && availableEpisodes(e, now) > 0,
    )
    .sort((a, b) => b.priority - a.priority || recentFirst(a, b));
  const candidates = watching.length ? watching : planned;
  return (
    candidates[
      (candidates.findIndex((e) => e.localId === previousId) + 1) %
        candidates.length
    ] ?? null
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
    const remaining = availableEpisodes(entry);
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
