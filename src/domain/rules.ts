import {
  type AppData,
  type Entry,
  type DiaryEvent,
  id,
  now,
  entrySchema,
} from "./model";
export function setEpisodes(entry: Entry, value: number): Entry {
  if (!Number.isInteger(value))
    throw new Error("Episodes must be a whole number.");
  const watchedEpisodes = Math.max(
    0,
    Math.min(value, entry.totalEpisodes ?? 100000),
  );
  return entrySchema.parse({
    ...entry,
    watchedEpisodes,
    lastWatchedDate:
      watchedEpisodes > entry.watchedEpisodes ? now() : entry.lastWatchedDate,
    startedDate:
      watchedEpisodes > 0 ? (entry.startedDate ?? now()) : entry.startedDate,
    personalStatus:
      watchedEpisodes > 0 && entry.personalStatus === "Planning"
        ? "Watching"
        : entry.personalStatus,
  });
}
export function completeEntry(entry: Entry): Entry {
  return {
    ...entry,
    personalStatus: "Completed",
    watchedEpisodes: entry.totalEpisodes ?? entry.watchedEpisodes,
    completedDate: now(),
    watchedDate: now(),
    lastWatchedDate: now(),
    startedDate: entry.startedDate ?? now(),
  };
}
export function event(
  entryId: string,
  kind: DiaryEvent["kind"],
  detail: string,
  episodeDelta = 0,
): DiaryEvent {
  return { id: id(), entryId, at: now(), kind, detail, episodeDelta };
}
export function ratingLabel(value: number | null) {
  return value === null ? "Not rated" : `${value / 2} / 5`;
}
export function filterEntries(data: AppData): Entry[] {
  const p = data.preferences;
  const query = p.search.toLocaleLowerCase().trim();
  return data.entries
    .filter(
      (e) =>
        (p.filter === "All" ||
          (p.filter === "Favorites"
            ? e.favorite
            : e.personalStatus === p.filter)) &&
        (!query ||
          [
            e.preferredTitle,
            e.cachedMetadata.romaji,
            e.cachedMetadata.english,
            e.cachedMetadata.native,
            ...e.cachedMetadata.synonyms,
          ].some((t) => t?.toLocaleLowerCase().includes(query))) &&
        (!p.year || String(e.cachedMetadata.year) === p.year) &&
        (!p.genre || e.cachedMetadata.genres.includes(p.genre)) &&
        (!p.format || e.cachedMetadata.format === p.format) &&
        (!p.studio || e.cachedMetadata.studios.includes(p.studio)) &&
        (!p.season || e.cachedMetadata.season === p.season) &&
        (!p.tag || e.personalTags.includes(p.tag)) &&
        (!p.minRating || (e.personalRating ?? 0) >= p.minRating),
    )
    .sort((a, b) => {
      let c = 0;
      switch (p.sort) {
        case "title":
          c = a.preferredTitle.localeCompare(b.preferredTitle);
          break;
        case "rating":
          c = (a.personalRating ?? 0) - (b.personalRating ?? 0);
          break;
        case "year":
          c = (a.cachedMetadata.year ?? 0) - (b.cachedMetadata.year ?? 0);
          break;
        case "episodes":
          c = a.watchedEpisodes - b.watchedEpisodes;
          break;
        case "community":
          c =
            (a.cachedMetadata.averageScore ?? 0) -
            (b.cachedMetadata.averageScore ?? 0);
          break;
        case "status":
          c = a.personalStatus.localeCompare(b.personalStatus);
          break;
        case "watched":
          c = (a.lastWatchedDate ?? "").localeCompare(b.lastWatchedDate ?? "");
          break;
        default:
          c = a.addedDate.localeCompare(b.addedDate);
      }
      return (p.descending ? -1 : 1) * c || a.localId.localeCompare(b.localId);
    });
}
export function statistics(data: AppData) {
  const es = data.entries;
  const rated = es.filter((e) => e.personalRating !== null);
  const count = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>(
        (acc, v) => ((acc[v] = (acc[v] ?? 0) + 1), acc),
        {},
      ),
    ).sort((a, b) => b[1] - a[1]);
  return {
    total: es.length,
    completed: es.filter((e) => e.personalStatus === "Completed").length,
    episodes: es.reduce((s, e) => s + e.watchedEpisodes, 0),
    hours: Math.round(
      es.reduce(
        (s, e) => s + e.watchedEpisodes * (e.cachedMetadata.duration ?? 24),
        0,
      ) / 60,
    ),
    mean: rated.length
      ? rated.reduce((s, e) => s + e.personalRating!, 0) / rated.length / 2
      : 0,
    rewatches: es.reduce((s, e) => s + e.rewatchCount, 0),
    genres: count(es.flatMap((e) => e.cachedMetadata.genres)),
    studios: count(es.flatMap((e) => e.cachedMetadata.studios)),
    decades: count(
      es.flatMap((e) =>
        e.cachedMetadata.year
          ? [`${Math.floor(e.cachedMetadata.year / 10) * 10}s`]
          : [],
      ),
    ),
    seasons: count(
      es.flatMap((e) =>
        e.cachedMetadata.season ? [e.cachedMetadata.season] : [],
      ),
    ),
    months: count(
      data.history
        .filter((h) => h.kind === "completed")
        .map((h) => h.at.slice(0, 7)),
    ),
    ratings: Array.from(
      { length: 10 },
      (_, i) =>
        [
          String((i + 1) / 2),
          es.filter((e) => e.personalRating === i + 1).length,
        ] as [string, number],
    ),
  };
}
