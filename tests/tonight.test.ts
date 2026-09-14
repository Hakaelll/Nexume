import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createEntry } from "../src/domain/model";
import { mapAnime, type AniListDTO } from "../src/services/anilist/provider";
import {
  availableEpisodes,
  evaluateTonight,
  homeSpotlight,
} from "../src/domain/tonight";
const sample = JSON.parse(
  readFileSync("public/demo/anime.json", "utf8"),
) as AniListDTO[];
function entry(index = 0) {
  const e = createEntry(mapAnime(sample[index]));
  e.cachedMetadata.duration = 25;
  e.cachedMetadata.format = "TV";
  e.cachedMetadata.isAdult = false;
  e.totalEpisodes = 12;
  return e;
}
const options = {
  minutes: 50,
  intent: "start" as const,
  genre: "",
  adult: false,
};
describe("tonight selection", () => {
  it("waits for the next broadcast and never extrapolates stale weekly dates", () => {
    const e = entry();
    e.personalStatus = "Watching";
    e.cachedMetadata.status = "RELEASING";
    e.watchedEpisodes = 6;
    const saturday = Date.parse("2026-09-19T18:00:00Z");
    e.cachedMetadata.nextAiringEpisode = {
      episode: 7,
      airingAt: saturday / 1000,
    };
    expect(availableEpisodes(e, saturday - 1)).toBe(0);
    expect(homeSpotlight([e], saturday - 1)).toBeNull();
    expect(availableEpisodes(e, saturday)).toBe(1);
    e.watchedEpisodes = 7;
    expect(availableEpisodes(e, saturday + 14 * 86400000)).toBe(0);
    e.cachedMetadata.nextAiringEpisode = null;
    expect(homeSpotlight([e], saturday)).toBeNull();
    e.cachedMetadata.status = "FINISHED";
    expect(availableEpisodes(e, saturday)).toBe(5);
  });
  it("rotates eligible titles, excludes unaired Planning entries and caps tonight by aired progress", () => {
    const a = entry(),
      b = entry(1),
      upcoming = entry(2);
    a.personalStatus = b.personalStatus = "Watching";
    upcoming.cachedMetadata.status = "NOT_YET_RELEASED";
    upcoming.cachedMetadata.nextAiringEpisode = null;
    expect(homeSpotlight([upcoming])).toBeNull();
    const first = homeSpotlight([a, b])!;
    expect(homeSpotlight([a, b], Date.now(), first.localId)?.localId).not.toBe(
      first.localId,
    );
    a.cachedMetadata.status = "RELEASING";
    a.watchedEpisodes = 5;
    a.cachedMetadata.nextAiringEpisode = {
      episode: 7,
      airingAt: Math.floor(Date.now() / 1000) + 86400,
    };
    expect(
      evaluateTonight([a], { ...options, intent: "continue", minutes: 90 })
        .candidates[0].episodes,
    ).toBe(1);
    a.watchedEpisodes = 6;
    expect(
      evaluateTonight([a], { ...options, intent: "continue" }).candidates,
    ).toEqual([]);
  });
  it("fits the exact boundary and caps episodes by remaining progress", () => {
    const e = entry();
    e.watchedEpisodes = 11;
    expect(evaluateTonight([e], options).candidates[0]).toMatchObject({
      episodes: 1,
      minutes: 25,
    });
    e.watchedEpisodes = 0;
    expect(
      evaluateTonight([e], { ...options, minutes: 25 }).candidates[0].episodes,
    ).toBe(1);
    expect(
      evaluateTonight([e], { ...options, minutes: 24 }).candidates,
    ).toEqual([]);
  });
  it("requires the complete movie and never offers several movie episodes", () => {
    const e = entry();
    e.cachedMetadata.format = "MOVIE";
    e.cachedMetadata.duration = 90;
    expect(evaluateTonight([e], options).candidates).toEqual([]);
    expect(
      evaluateTonight([e], { ...options, minutes: 180 }).candidates[0],
    ).toMatchObject({ episodes: 1, minutes: 90 });
  });
  it("explains missing durations and includes them without a time limit", () => {
    const e = entry();
    e.cachedMetadata.duration = null;
    expect(evaluateTonight([e], options)).toEqual({
      candidates: [],
      unknownDuration: 1,
    });
    expect(
      evaluateTonight([e], { ...options, minutes: null }).candidates[0],
    ).toMatchObject({ episodes: null, minutes: null });
  });
  it("respects intent, genre, adult settings, completed progress and invalid input", () => {
    const e = entry();
    e.personalStatus = "Watching";
    expect(evaluateTonight([e], options).candidates).toEqual([]);
    expect(
      evaluateTonight([e], { ...options, intent: "continue" }).candidates,
    ).toHaveLength(1);
    e.watchedEpisodes = 12;
    expect(
      evaluateTonight([e], { ...options, intent: "continue" }).candidates,
    ).toEqual([]);
    for (const minutes of [0, -1, NaN, Infinity])
      expect(
        evaluateTonight([entry()], { ...options, minutes }).candidates,
      ).toEqual([]);
    expect(
      evaluateTonight([entry()], { ...options, genre: "Nonexistent" })
        .candidates,
    ).toEqual([]);
    const adult = entry();
    adult.cachedMetadata.isAdult = true;
    expect(evaluateTonight([adult], options).candidates).toEqual([]);
  });
  it("prioritizes pending entries and returns at most three unique candidates", () => {
    const es = [0, 1, 2, 3].map(entry);
    es[3].priority = 3;
    const result = evaluateTonight(es, options).candidates;
    expect(result).toHaveLength(3);
    expect(result[0].entry.localId).toBe(es[3].localId);
    expect(result[0].reasons).toContain("You marked it Top priority");
  });
  it("uses activity for continuing and Home, with a pending fallback", () => {
    const a = entry(),
      b = entry(1);
    a.personalStatus = "Watching";
    b.personalStatus = "Rewatching";
    a.lastWatchedDate = "2026-09-11T12:00:00Z";
    b.lastWatchedDate = "2026-09-12T12:00:00Z";
    expect(homeSpotlight([a, b])?.localId).toBe(b.localId);
    expect(
      evaluateTonight([a, b], { ...options, intent: "continue" }).candidates[0]
        .entry.localId,
    ).toBe(b.localId);
    a.personalStatus = "Planning";
    b.personalStatus = "Planning";
    a.priority = 3;
    expect(homeSpotlight([a, b])?.localId).toBe(a.localId);
    expect(homeSpotlight([])).toBeNull();
  });
});
