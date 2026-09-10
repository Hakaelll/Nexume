import type { Anime } from "./model";
export interface RecommendationFilters {
  genre: string;
  format: string;
  minYear: number;
  maxEpisodes: number;
  adult: boolean;
}
export function filterRecommendations(
  items: Anime[],
  filters: RecommendationFilters,
): Anime[] {
  return [...new Map(items.map((a) => [a.anilistId, a])).values()].filter(
    (a) =>
      (filters.adult || !a.isAdult) &&
      (!filters.genre || a.genres.includes(filters.genre)) &&
      (!filters.format || a.format === filters.format) &&
      (!filters.minYear || (a.year !== null && a.year >= filters.minYear)) &&
      (!filters.maxEpisodes ||
        (a.episodes !== null &&
          a.episodes > 0 &&
          a.episodes <= filters.maxEpisodes)),
  );
}
export function pickRecommendation(
  items: Anime[],
  previous?: number,
  random = Math.random,
): Anime | null {
  const pool =
    items.length > 1 ? items.filter((a) => a.anilistId !== previous) : items;
  return pool.length
    ? pool[
        Math.min(
          pool.length - 1,
          Math.max(0, Math.floor(random() * pool.length)),
        )
      ]
    : null;
}
