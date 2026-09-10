import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../platform";
import {
  emptyData,
  stateSchema,
  type AppData,
  type Preferences,
} from "../../domain/model";
export interface Repository {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  savePreferences(preferences: Preferences): Promise<void>;
}
export const STORAGE_KEY = "nexume.preview.v1";
class BrowserRepository implements Repository {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return stateSchema.parse(JSON.parse(raw));
    const data = emptyData();
    await this.save(data);
    return data;
  }
  async save(data: AppData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(data)));
  }
  async savePreferences(preferences: Preferences) {
    const data = await this.load();
    await this.save({ ...data, preferences });
  }
}
class SqliteRepository implements Repository {
  private db: Database | null = null;
  async load() {
    this.db = await Database.load("sqlite:nexume.db");
    const settings = await this.db.select<{ data: string }[]>(
      "SELECT data FROM preferences WHERE key = $1",
      ["app"],
    );
    if (!settings.length) {
      const data = emptyData();
      await this.save(data);
      return data;
    }
    const read = async (table: string) => {
      const rows = await this.db!.select<{ data: string }[]>(
        `SELECT data FROM ${table}`,
      );
      return rows.map((r) => JSON.parse(r.data));
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
    return stateSchema.parse({
      entries,
      lists,
      profile: profile[0],
      history,
      queue,
      searchHistory: searchHistory.map((h) => h.query),
      preferences: JSON.parse(settings[0].data),
    });
  }
  async save(data: AppData) {
    await invoke("save_state", { state: stateSchema.parse(data) });
  }
  async savePreferences(preferences: Preferences) {
    await invoke("save_preferences", { preferences });
  }
}
export const repository: Repository = native
  ? new SqliteRepository()
  : new BrowserRepository();
