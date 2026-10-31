import { readFileSync } from "node:fs";
import { createEntry, emptyData, type AppData } from "../../src/domain/model";
import { event } from "../../src/domain/rules";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
export const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map((anime) => ({
  ...anime,
  coverImage: {
    large: `/demo/${anime.id}-cover.jpg`,
    extraLarge: `/demo/${anime.id}-cover.jpg`,
  },
  bannerImage: "",
}));

export function fixture(
  count = 12,
  section: AppData["preferences"]["section"] = "Home",
) {
  const data = emptyData();
  data.entries = Array.from({ length: count }, (_, index) => {
    const anime = sample[index % sample.length];
    return createEntry(
      mapAnime({
        ...anime,
        id: 100000 + index,
        title: { romaji: `Anime ${String(index).padStart(4, "0")}` },
      }),
      section === "Watchlist" ? "Planning" : "Watching",
    );
  });
  Object.assign(data.preferences, {
    section,
    view: "Grid",
    language: "en",
    motionMode: "reduced",
    sort: "title",
    descending: false,
  });
  data.profile.favoriteIds = data.entries
    .slice(0, 3)
    .map((entry) => entry.localId);
  data.history = [
    event(data.entries[0].localId, "episode", "Watched episode 1", 1),
  ];
  data.lists = [
    {
      id: crypto.randomUUID(),
      publicId: crypto.randomUUID(),
      title: "Favorites",
      description: "My collection",
      coverImage: "",
      entryIds: data.profile.favoriteIds,
      ranked: false,
      privacy: "Private",
      shareThoughts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  return data;
}
