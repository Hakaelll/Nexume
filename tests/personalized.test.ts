import { describe, expect, it } from "vitest";
import { createEntry, preferencesSchema } from "../src/domain/model";
import { personalize } from "../src/domain/personalized";
import { mapAnime } from "../src/services/anilist/provider";
import { resolveLanguage, translate } from "../src/core/i18n";

const anime = (id: number, genres: string[] = [], score = 80) => ({
  ...mapAnime({ id, title: { romaji: `Anime ${id}` } }),
  genres,
  averageScore: score,
  studios: ["Studio"],
});
describe("personal discovery and backward compatible preferences", () => {
  it("ranks real affinity before community scores and resolves ties by ID", () => {
    const entry = {
      ...createEntry(anime(1, ["Drama", "Comedy"])),
      personalRating: 8,
    };
    const candidates = [
      anime(4, ["Drama"]),
      anime(3, ["Drama"]),
      anime(5, [], 100),
      anime(2, ["Drama", "Comedy"], 50),
    ];
    const picks = personalize(candidates, [entry], [], []);
    expect(picks.map((p) => p.anime.anilistId)).toEqual([2, 3, 4, 5]);
    expect(picks[0].genres).toEqual(["Drama", "Comedy"]);
    expect(personalize([...candidates].reverse(), [entry], [], [])).toEqual(
      picks,
    );
  });
  it("excludes saved, hidden and adult titles and labels general proposals", () => {
    const entry = createEntry(anime(1));
    const picks = personalize(
      [anime(1), anime(2), { ...anime(3), isAdult: true }, anime(4), anime(4)],
      [entry],
      [],
      [2],
    );
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({
      personalized: false,
      genres: [],
      studios: [],
    });
    expect(
      personalize([anime(2)], [], [], []).map((p) => p.anime.anilistId),
    ).toEqual([2]);
  });
  it("supplies defaults for old backups and retains new preferences", () => {
    expect(preferencesSchema.parse({})).toMatchObject({
      theme: "light",
      language: "system",
      hiddenRecommendations: [],
    });
    expect(
      preferencesSchema.parse({
        theme: "dark",
        language: "es",
        hiddenRecommendations: [42],
      }),
    ).toMatchObject({
      theme: "dark",
      language: "es",
      hiddenRecommendations: [42],
    });
  });
  it("uses Spanish system locales, English fallback and preserves personal text", () => {
    expect(resolveLanguage("system", "es-ES")).toBe("es");
    expect(resolveLanguage("system", "fr-FR")).toBe("en");
    expect(
      translate("Opening {section}…", "es", { section: "Biblioteca" }),
    ).toBe("Abriendo Biblioteca…");
    expect(translate("My personal anime title", "es")).toBe(
      "My personal anime title",
    );
  });
});
