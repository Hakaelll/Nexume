import { afterEach, expect, it, vi } from "vitest";
import { emptyData } from "../src/domain/model";
import { createEntry } from "../src/domain/model";
import { mapAnime, type AniListDTO } from "../src/services/anilist/provider";
import { readFileSync } from "node:fs";
vi.mock("../src/core/platform", () => ({ native: false }));
vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load: vi.fn() } }));
import Database from "@tauri-apps/plugin-sql";
import {
  BrowserRepository,
  SqliteRepository,
  STORAGE_KEY,
} from "../src/core/database/repository";
afterEach(() => vi.unstubAllGlobals());

it("reuses the saved snapshot but observes external changes and failed writes", async () => {
  let raw: string | null = null;
  const setItem = vi.fn((_key: string, value: string) => {
    raw = value;
  });
  vi.stubGlobal("localStorage", { getItem: () => raw, setItem });
  const repository = new BrowserRepository();
  await repository.save(emptyData());
  const initial = await repository.load();
  expect(await repository.load()).toBe(initial);
  await repository.savePreferences({
    ...initial.preferences,
    section: "Library",
  });
  const navigated = await repository.load();
  expect(navigated.entries).toBe(initial.entries);
  expect(navigated.preferences.section).toBe("Library");
  setItem.mockImplementationOnce(() => {
    throw new Error("Disk full");
  });
  await expect(
    repository.save({
      ...navigated,
      profile: { ...navigated.profile, displayName: "Unsaved" },
    }),
  ).rejects.toThrow("Disk full");
  expect(await repository.load()).toBe(navigated);
  raw = JSON.stringify({
    ...emptyData(),
    profile: { ...initial.profile, displayName: "External change" },
  });
  expect((await repository.load()).profile.displayName).toBe("External change");
  expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
});

it("restores native snapshot order and still loads databases without order metadata", async () => {
  const anime = (
    JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
  ).map(mapAnime);
  const state = {
    ...emptyData(),
    entries: anime.slice(0, 2).map((a) => createEntry(a)),
  };
  let legacy = false;
  const select = vi.fn(async (query: string) => {
    if (query.includes("FROM preferences"))
      return [
        { key: "app", data: JSON.stringify(state.preferences) },
        ...(legacy
          ? []
          : [
              {
                key: "collection_order",
                data: JSON.stringify({
                  library_entries: state.entries
                    .map((e) => e.localId)
                    .reverse(),
                }),
              },
            ]),
      ];
    const data = query.includes("FROM library_entries")
      ? state.entries
      : query.includes("FROM profile")
        ? [state.profile]
        : [];
    return data.map((value) => ({ data: JSON.stringify(value) }));
  });
  vi.mocked(Database.load).mockResolvedValue({ select } as unknown as Database);
  const repository = new SqliteRepository();
  expect((await repository.load()).entries.map((e) => e.localId)).toEqual(
    state.entries.map((e) => e.localId).reverse(),
  );
  expect(select).toHaveBeenCalledWith(
    "SELECT data FROM search_history ORDER BY id",
  );
  legacy = true;
  expect((await repository.load()).entries.map((e) => e.localId)).toEqual(
    state.entries.map((e) => e.localId),
  );
});
