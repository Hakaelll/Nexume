import type { Anime } from "./model";

/** Prefer provider originals without replacing a custom/local cover. */
export function animeCover(anime: Anime, savedCover?: string): string {
  if (
    savedCover &&
    savedCover !== anime.coverImage &&
    savedCover !== anime.coverLarge
  )
    return savedCover;
  return anime.coverLarge || savedCover || anime.coverImage;
}
