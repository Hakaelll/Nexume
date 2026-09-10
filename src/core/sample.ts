import { createEntry, type AppData, type Entry, now } from "../domain/model";
import { mapAnime, type AniListDTO } from "../services/anilist/provider";
export async function sampleEntries(): Promise<Entry[]> {
  const response = await fetch("/demo/anime.json");
  if (!response.ok)
    throw new Error(
      "Sample collection is not available. Search AniList to start your library.",
    );
  const items = (await response.json()) as AniListDTO[];
  return items.map((dto, i) => {
    const m = { ...mapAnime(dto), source: "Sample" as const };
    const e = createEntry(m);
    return {
      ...e,
      coverImage: `/demo/${dto.id}-cover.jpg`,
      bannerImage: dto.bannerImage ? `/demo/${dto.id}-banner.jpg` : "",
      personalStatus: i < 4 ? "Watching" : "Completed",
      watchedEpisodes:
        i < 4 ? Math.min(3 + i * 2, m.episodes ?? 12) : (m.episodes ?? 0),
      personalRating: i < 4 ? null : [9, 8, 10, 7, 9, 8, 10, 9][(i - 4) % 8],
      liked: i % 3 === 0,
      shortOpinion: i < 4 ? "" : "Sample thought: a world worth returning to.",
      personalTags: ["sample"],
      lastWatchedDate: now(),
      completedDate: i < 4 ? null : now(),
      watchedDate: i < 4 ? null : now(),
    };
  });
}
export function addSample(data: AppData, entries: Entry[]): AppData {
  return {
    ...data,
    entries: [
      ...data.entries,
      ...entries.filter(
        (e) => !data.entries.some((old) => old.anilistId === e.anilistId),
      ),
    ],
  };
}
