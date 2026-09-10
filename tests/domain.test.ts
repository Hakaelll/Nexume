import { describe, it, expect } from "vitest";
import {
  emptyData,
  createEntry,
  entrySchema,
  id,
  stateSchema,
} from "../src/domain/model";
import { mapAnime, retryDelay } from "../src/services/anilist/provider";
import { setEpisodes, completeEntry, statistics } from "../src/domain/rules";
import {
  exportBackup,
  parseBackup,
  mergeBackup,
  exportCsv,
} from "../src/domain/backup";
import {
  budgets,
  visibleRange,
  navigate,
  ResourceCache,
  casePose,
} from "../src/graphics/layout";
const anime = () =>
  mapAnime({ id: 1, title: { romaji: "Test anime" }, episodes: 12 });
describe("local collection invariants", () => {
  it("maps incomplete AniList data and strips markup without executing it", () => {
    const m = mapAnime({
      id: 2,
      description: "<script>bad()</script><b>Story</b><br>Two &amp; three",
    });
    expect(m.episodes).toBeNull();
    expect(m.romaji).toBe("Anime 2");
    expect(m.description).not.toContain("<");
    expect(m.studios).toEqual([]);
  });
  it("allows each half star but rejects fractions and overflow", () => {
    const e = createEntry(anime());
    for (let n = 1; n <= 10; n++)
      expect(
        entrySchema.parse({ ...e, personalRating: n }).personalRating,
      ).toBe(n);
    for (const value of [0, 11, 2.5])
      expect(() =>
        entrySchema.parse({ ...e, personalRating: value }),
      ).toThrow();
  });
  it("clamps episodes, starts a title and leaves completion deliberate", () => {
    const e = createEntry(anime());
    expect(setEpisodes(e, -10).watchedEpisodes).toBe(0);
    const updated = setEpisodes(e, 99);
    expect(updated.watchedEpisodes).toBe(12);
    expect(updated.personalStatus).toBe("Watching");
    expect(completeEntry(updated).personalStatus).toBe("Completed");
    expect(() => setEpisodes(e, 1.5)).toThrow();
  });
  it("keeps likes separate from ratings and opinions separate from notes", () => {
    const e = entrySchema.parse({
      ...createEntry(anime()),
      liked: true,
      personalRating: null,
      shortOpinion: "Public thought",
      privateNotes: "Secret",
      review: "Long review",
      reviewContainsSpoilers: true,
    });
    expect(e.personalRating).toBeNull();
    expect(e.liked).toBe(true);
    expect(e.privateNotes).toBe("Secret");
  });
  it("round trips backups and rejects corruption and duplicates", () => {
    const d = emptyData();
    d.entries = [createEntry(anime())];
    const restored = parseBackup(exportBackup(d));
    expect(restored.entries).toEqual(d.entries);
    expect(() => parseBackup("{")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ backupVersion: 2, data: d })),
    ).toThrow();
    d.entries.push(d.entries[0]);
    expect(() => stateSchema.parse(d)).toThrow();
  });
  it("validates list membership, ordering and favorite references", () => {
    const d = emptyData();
    const e = createEntry(anime());
    d.entries = [e];
    d.lists = [
      {
        id: id(),
        publicId: id(),
        title: "List",
        description: "",
        coverImage: "",
        entryIds: [e.localId, e.localId],
        ranked: true,
        privacy: "Private",
        shareThoughts: false,
        createdAt: "2026",
        updatedAt: "2026",
      },
    ];
    expect(() => stateSchema.parse(d)).toThrow();
    d.lists[0].entryIds = [e.localId];
    expect(stateSchema.parse(d).lists[0].entryIds).toEqual([e.localId]);
    d.profile.favoriteIds = [id()];
    expect(() => stateSchema.parse(d)).toThrow();
  });
  it("merges backups while preserving existing personal records", () => {
    const a = emptyData(),
      b = emptyData();
    a.entries = [{ ...createEntry(anime()), shortOpinion: "Original" }];
    b.entries = [
      { ...createEntry(anime()), shortOpinion: "Incoming" },
      createEntry(mapAnime({ id: 2 })),
    ];
    const result = mergeBackup(a, b);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].shortOpinion).toBe("Original");
  });
  it("neutralizes spreadsheet formulas in CSV", () => {
    const d = emptyData();
    d.entries = [
      { ...createEntry(anime()), preferredTitle: '=HYPERLINK("evil")' },
    ];
    expect(exportCsv(d)).toContain("'=HYPERLINK");
  });
  it("calculates missing duration safely", () => {
    const d = emptyData();
    d.entries = [setEpisodes(createEntry(anime()), 10)];
    expect(statistics(d).hours).toBe(4);
  });
  it("honors both Retry-After formats", () => {
    expect(retryDelay("4", 0)).toBe(4000);
    expect(
      retryDelay(
        "Wed, 09 Sep 2026 12:00:04 GMT",
        0,
        Date.parse("2026-09-09T12:00:00Z"),
      ),
    ).toBe(4000);
    expect(retryDelay(null, 2)).toBe(6000);
  });
});
describe("bounded spatial logic", () => {
  for (const size of [10, 100, 500, 1000])
    it(`virtualizes ${size} titles`, () => {
      for (const index of [0, Math.floor(size / 2), size - 1]) {
        const range = visibleRange(index, size, budgets.High.radius);
        expect(range.length).toBeLessThanOrEqual(21);
        expect(range).toContain(index);
        expect(range.every((i) => i >= 0 && i < size)).toBe(true);
      }
    });
  it("clamps navigation and uses deterministic depth", () => {
    expect(navigate(0, -1, 1000)).toBe(0);
    expect(navigate(999, 1, 1000)).toBe(999);
    expect(visibleRange(0, 0, 7)).toEqual([]);
    expect(casePose(0).z).toBeGreaterThan(casePose(1).z);
    expect(casePose(-1).x).toBe(-casePose(1).x);
  });
  it("disposes evicted resources and respects recent access", () => {
    const disposed: string[] = [];
    const cache = new ResourceCache<{ dispose: () => void }>(2);
    const value = (name: string) => ({ dispose: () => disposed.push(name) });
    cache.set("a", value("a"));
    cache.set("b", value("b"));
    cache.get("a");
    cache.set("c", value("c"));
    expect(disposed).toEqual(["b"]);
    cache.clear();
    expect(disposed).toEqual(["b", "a", "c"]);
  });
});
