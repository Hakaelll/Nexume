import { it, expect } from "vitest";
import { mapAnime } from "../src/services/anilist/provider";
import {
  filterRecommendations,
  pickRecommendation,
} from "../src/domain/recommendation";
const base = {
  genre: "",
  format: "",
  minYear: 0,
  maxEpisodes: 0,
  adult: false,
};
const a = mapAnime({
  id: 1,
  title: { romaji: "One" },
  genres: ["Action"],
  format: "TV",
  seasonYear: 2000,
  episodes: 12,
  isAdult: false,
});
const b = mapAnime({
  id: 2,
  title: { romaji: "Two" },
  genres: ["Drama"],
  format: "MOVIE",
  seasonYear: 2020,
  episodes: 1,
  isAdult: false,
});
it("combines recommendation filters without accepting unknown episode counts", () => {
  expect(
    filterRecommendations([a, b, mapAnime({ id: 3 })], {
      ...base,
      genre: "Action",
      format: "TV",
      minYear: 1999,
      maxEpisodes: 12,
    }),
  ).toEqual([a]);
  expect(filterRecommendations([a, b], { ...base, minYear: 2010 })).toEqual([
    b,
  ]);
  expect(
    filterRecommendations([mapAnime({ id: 3 })], { ...base, maxEpisodes: 12 }),
  ).toEqual([]);
});
it("deduplicates candidates and respects adult preference", () => {
  const adult = { ...a, isAdult: true };
  expect(filterRecommendations([adult, adult, b], base)).toEqual([b]);
  expect(
    filterRecommendations([adult, adult, b], { ...base, adult: true }),
  ).toHaveLength(2);
});
it("avoids immediate repeats while supporting empty and singleton pools", () => {
  expect(pickRecommendation([a, b], 1, () => 0)).toEqual(b);
  expect(pickRecommendation([], 1)).toBeNull();
  expect(pickRecommendation([a], 1)).toEqual(a);
});
it("can select either end of a candidate pool", () => {
  expect(pickRecommendation([a, b], undefined, () => 0)).toEqual(a);
  expect(pickRecommendation([a, b], undefined, () => 0.999)).toEqual(b);
});
