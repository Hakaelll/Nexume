import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyData, createEntry, stateSchema } from "../src/domain/model";
import { mapAnime, type AniListDTO } from "../src/services/anilist/provider";
import {
  validateSnapshot,
  validatePreferences,
} from "../src/core/database/validation";

const anime = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map(mapAnime);
describe("immutable validation", () => {
  it("reuses validated entries and collections while checking changed entries", () => {
    const data = validateSnapshot({
      ...emptyData(),
      entries: anime.map((a) => createEntry(a)),
    });
    expect(validateSnapshot(data)).toBe(data);
    const next = validateSnapshot({
      ...data,
      entries: data.entries.map((entry, i) =>
        i === 0 ? { ...entry, liked: true } : entry,
      ),
    });
    expect(next.entries[0].liked).toBe(true);
    expect(next.entries[0]).not.toBe(data.entries[0]);
    expect(next.entries[1]).toBe(data.entries[1]);
    expect(next.history).toBe(data.history);
    expect(next.lists).toBe(data.lists);
    expect(next.profile).toBe(data.profile);
    expect(next.preferences).toBe(data.preferences);
    expect(() => {
      data.entries[0].cachedMetadata.genres.push("tampered");
    }).toThrow();
    expect(() => {
      next.entries[0].liked = false;
    }).toThrow();
    expect(() =>
      validateSnapshot({
        ...next,
        entries: [{ ...next.entries[0], watchedEpisodes: -1 }],
      }),
    ).toThrow();
  });
  it("still enforces cross-record constraints after cache hits", () => {
    const data = validateSnapshot({
      ...emptyData(),
      entries: [createEntry(anime[0])],
    });
    const invalid = { ...data, entries: [data.entries[0], data.entries[0]] };
    expect(stateSchema.safeParse(invalid).success).toBe(false);
    expect(() => validateSnapshot(invalid)).toThrow(/Duplicate/);
    expect(() =>
      validateSnapshot({
        ...data,
        profile: { ...data.profile, favoriteIds: [crypto.randomUUID()] },
      }),
    ).toThrow(/missing anime/);
  });
  it("does not trust arbitrary frozen data and keeps preference arrays stable", () => {
    expect(() =>
      validateSnapshot(Object.freeze({ ...emptyData(), entries: [{}] })),
    ).toThrow();
    const first = validatePreferences(emptyData().preferences);
    const second = validatePreferences({ ...first, scrollTop: 100 });
    expect(second.columns).toBe(first.columns);
    expect(second.publications).toBe(first.publications);
    expect(second.scrollTop).toBe(100);
  });
});
