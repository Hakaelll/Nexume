import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../platform";
import { emptyData, type AppData, type Preferences } from "../../domain/model";
import { validateSnapshot } from "./validation";
export interface Repository {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  savePreferences(preferences: Preferences): Promise<void>;
}
export const STORAGE_KEY = "nexume.preview.v1";
export class BrowserRepository implements Repository {
  private snapshot: AppData | null = null;
  private raw: string | null = null;
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      if (raw === this.raw && this.snapshot) return this.snapshot;
      const snapshot = validateSnapshot(JSON.parse(raw));
      this.raw = raw;
      this.snapshot = snapshot;
      return snapshot;
    }
    const data = emptyData();
    await this.save(data);
    return data;
  }
  async save(data: AppData) {
    const snapshot = validateSnapshot(data);
    const raw = JSON.stringify(snapshot);
    localStorage.setItem(STORAGE_KEY, raw);
    // Update the memory cache only after persistence succeeds.
    this.raw = raw;
    this.snapshot = snapshot;
  }
  async savePreferences(preferences: Preferences) {
    const data = await this.load();
    await this.save({ ...data, preferences });
  }
}
export class SqliteRepository implements Repository {
  private db: Database | null = null;
  async load() {
    this.db = await Database.load("sqlite:nexume.db");
    const settings = await this.db.select<{ key: string; data: string }[]>(
      "SELECT key, data FROM preferences WHERE key IN ('app', 'collection_order')",
    );
    const preferences = settings.find((setting) => setting.key === "app");
    if (!preferences) {
      const data = emptyData();
      await this.save(data);
      return data;
    }
    const order = JSON.parse(
      settings.find((setting) => setting.key === "collection_order")?.data ??
        "{}",
    ) as Record<string, string[]>;
    const read = async (table: string) => {
      const rows = await this.db!.select<{ data: string }[]>(
        `SELECT data FROM ${table}${table === "search_history" ? " ORDER BY id" : ""}`,
      );
      const items = rows.map(
        (r) => JSON.parse(r.data) as Record<string, unknown>,
      );
      if (Array.isArray(order[table])) {
        const positions = new Map(order[table].map((id, index) => [id, index]));
        items.sort(
          (a, b) =>
            (positions.get(String(a.localId ?? a.id)) ?? Infinity) -
            (positions.get(String(b.localId ?? b.id)) ?? Infinity),
        );
      }
      return items;
    };
    const [entries, lists, profile, history, queue, searchHistory] =
      await Promise.all([
        read("library_entries"),
        read("custom_lists"),
        read("profile"),
        read("watch_history"),
        read("sync_queue"),
        read("search_history"),
      ]);
    return validateSnapshot({
      entries,
      lists,
      profile: profile[0],
      history,
      queue,
      searchHistory: searchHistory.map((h) => h.query),
      preferences: JSON.parse(preferences.data),
    });
  }
  async save(data: AppData) {
    await invoke("save_state", { state: validateSnapshot(data) });
  }
  async savePreferences(preferences: Preferences) {
    await invoke("save_preferences", { preferences });
  }
}
export const repository: Repository = native
  ? new SqliteRepository()
  : new BrowserRepository();
