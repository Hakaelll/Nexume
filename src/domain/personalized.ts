import type { Anime, Entry } from "./model";
export interface PersonalPick {
  anime: Anime;
  genres: string[];
  studios: string[];
  personalized: boolean;
}
export function personalize(
  items: Anime[],
  entries: Entry[],
  favorites: string[],
  hidden: number[],
  adult = false,
): PersonalPick[] {
  const saved = new Set(entries.map((e) => e.anilistId));
  const excluded = new Set(hidden);
  const liked = entries.filter(
    (e) =>
      favorites.includes(e.localId) ||
      e.favorite ||
      e.liked ||
      (e.personalRating ?? 0) >= 8,
  );
  const genres = new Set(liked.flatMap((e) => e.cachedMetadata.genres));
  const studios = new Set(liked.flatMap((e) => e.cachedMetadata.studios));
  return [...new Map(items.map((a) => [a.anilistId, a])).values()]
    .filter(
      (a) =>
        !saved.has(a.anilistId) &&
        !excluded.has(a.anilistId) &&
        (adult || !a.isAdult),
    )
    .map((anime) => ({
      anime,
      genres: anime.genres.filter((g) => genres.has(g)),
      studios: anime.studios.filter((s) => studios.has(s)),
      personalized: false,
    }))
    .map((pick) => ({
      ...pick,
      personalized: !!(pick.genres.length || pick.studios.length),
    }))
    .sort(
      (a, b) =>
        b.genres.length - a.genres.length ||
        b.studios.length - a.studios.length ||
        (b.anime.averageScore ?? -1) - (a.anime.averageScore ?? -1) ||
        a.anime.anilistId - b.anime.anilistId,
    );
}
