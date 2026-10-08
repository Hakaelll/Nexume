import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { emptyData } from "../src/domain/model";
import { mapAnime, type AniListDTO } from "../src/services/anilist/provider";

vi.mock("../src/core/database/repository", () => ({
  repository: {
    save: vi.fn(async () => {}),
    savePreferences: vi.fn(async () => {}),
  },
}));
import { repository } from "../src/core/database/repository";
import { useApp } from "../src/app/store";

const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map(mapAnime);
beforeEach(() => {
  vi.clearAllMocks();
  useApp.setState({ data: emptyData(), ready: true, saving: false, error: "" });
});

describe("batched additions and responsive preferences", () => {
  it("returns a failed save without replacing data and continues the queue", async () => {
    const original = useApp.getState().data;
    vi.mocked(repository.save).mockRejectedValueOnce(
      new Error("Disk unavailable"),
    );
    const failed = await useApp.getState().add(sample[0]);
    expect(failed).toMatchObject({
      ok: false,
      error: expect.stringContaining("Disk unavailable"),
    });
    expect(useApp.getState().data).toBe(original);
    expect(useApp.getState().saving).toBe(false);
    expect(await useApp.getState().add(sample[1])).toEqual({ ok: true });
    expect(useApp.getState().data.entries.map((e) => e.anilistId)).toEqual([
      sample[1].anilistId,
    ]);
  });
  it("collapses a burst of preferences into one write", async () => {
    const writes = Array.from({ length: 50 }, (_, i) =>
      useApp.getState().prefs({ scrollTop: i * 10 }),
    );
    expect(useApp.getState().data.preferences.scrollTop).toBe(490);
    await Promise.all(writes);
    expect(repository.savePreferences).toHaveBeenCalledTimes(1);
    expect(repository.savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ scrollTop: 490 }),
    );
  });

  it("persists changes arriving during an in-flight preference write", async () => {
    let finish!: () => void;
    vi.mocked(repository.savePreferences).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = useApp.getState().prefs({ search: "a" });
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const second = useApp.getState().prefs({ search: "anime" });
    finish();
    await Promise.all([first, second]);
    expect(repository.savePreferences).toHaveBeenCalledTimes(2);
    expect(repository.savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "anime" }),
    );
  });

  it("does not rewrite the collection for an unchanged mutation", async () => {
    await useApp.getState().add(sample[0]);
    const data = useApp.getState().data;
    vi.mocked(repository.save).mockClear();
    await useApp.getState().add(sample[0]);
    await useApp.getState().episodes(data.entries[0].localId, 0);
    expect(repository.save).not.toHaveBeenCalled();
    expect(useApp.getState().data).toBe(data);
  });

  it("saves a season once and leaves existing progress intact", async () => {
    await useApp.getState().add(sample[0]);
    const existing = useApp.getState().data.entries[0];
    await useApp.getState().edit(existing.localId, {
      personalStatus: "Watching",
      watchedEpisodes: 3,
    });
    vi.mocked(repository.save).mockClear();
    await useApp
      .getState()
      .addMany([sample[0], sample[1], sample[1], sample[2]]);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(useApp.getState().data.entries).toHaveLength(3);
    expect(
      useApp
        .getState()
        .data.entries.find((e) => e.localId === existing.localId),
    ).toMatchObject({ personalStatus: "Watching", watchedEpisodes: 3 });
  });

  it("navigates immediately while a collection save is pending and preserves both changes", async () => {
    let finish!: () => void;
    vi.mocked(repository.save).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const add = useApp.getState().add(sample[0]);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const first = useApp.getState().prefs({ section: "Stats" });
    const second = useApp.getState().prefs({ section: "Calendar" });
    expect(useApp.getState().data.preferences.section).toBe("Calendar");
    finish();
    await Promise.all([add, first, second]);
    expect(useApp.getState().data.entries).toHaveLength(1);
    expect(useApp.getState().data.preferences.section).toBe("Calendar");
    expect(repository.savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ section: "Calendar" }),
    );
  });

  it("retains preferences explicitly changed by backup imports", async () => {
    await useApp.getState().mutate((data) => ({
      ...data,
      preferences: { ...data.preferences, section: "Watchlist" },
    }));
    expect(useApp.getState().data.preferences.section).toBe("Watchlist");
  });

  it("merges only explicitly updated preferences during an import", async () => {
    let finish!: () => void;
    vi.mocked(repository.save).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const save = useApp.getState().mutate((data) => ({
      ...data,
      preferences: {
        ...data.preferences,
        section: "Watchlist",
        motionMode: "reduced",
      },
    }));
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const navigate = useApp.getState().prefs({ section: "Home" });
    finish();
    await Promise.all([save, navigate]);
    expect(useApp.getState().data.preferences).toMatchObject({
      section: "Home",
      motionMode: "reduced",
    });
  });

  it("reports failed preference persistence without undoing navigation", async () => {
    vi.mocked(repository.savePreferences).mockRejectedValueOnce(
      new Error("Disk unavailable"),
    );
    await useApp.getState().prefs({ section: "Stats" });
    expect(useApp.getState().data.preferences.section).toBe("Stats");
    expect(useApp.getState().error).toContain("Disk unavailable");
  });
});
