import { expect, it } from "vitest";
import { animeCover } from "../src/domain/artwork";
import { mapAnime } from "../src/services/anilist/provider";

it("uses the highest available provider resolution for new and saved anime", () => {
  const anime = mapAnime({
    id: 1,
    coverImage: {
      large: "https://example.com/small.jpg",
      extraLarge: "https://example.com/original.jpg",
    },
  });
  expect(anime.coverImage).toBe("https://example.com/original.jpg");
  const saved = { ...anime, coverImage: "https://example.com/small.jpg" };
  expect(animeCover(saved, saved.coverImage)).toBe(
    "https://example.com/original.jpg",
  );
  expect(animeCover(saved, "/demo/1-cover.jpg")).toBe("/demo/1-cover.jpg");
});
it("falls back to the available cover when the original is absent", () => {
  const anime = mapAnime({
    id: 1,
    coverImage: { large: "https://example.com/small.jpg", extraLarge: "" },
  });
  expect(animeCover(anime)).toBe("https://example.com/small.jpg");
});
