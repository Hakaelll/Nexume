import { create } from "zustand";
import { reconcilePublications } from "../services/social/reconcile";
import { repository } from "../core/database/repository";
import {
  validateSnapshot,
  validatePreferences,
} from "../core/database/validation";
import {
  type AppData,
  type Anime,
  type Entry,
  type Preferences,
  emptyData,
  createEntry,
  entrySchema,
  now,
  id,
} from "../domain/model";
import { setEpisodes, completeEntry, event } from "../domain/rules";
type Store = {
  data: AppData;
  ready: boolean;
  error: string;
  notice: string;
  saving: boolean;
  init: () => Promise<void>;
  mutate: (fn: (data: AppData) => AppData) => Promise<void>;
  prefs: (p: Partial<Preferences>) => Promise<void>;
  add: (anime: Anime) => Promise<void>;
  addMany: (anime: Anime[]) => Promise<void>;
  edit: (id: string, patch: Partial<Entry>) => Promise<void>;
  episodes: (id: string, n: number) => Promise<void>;
  adjustEpisodes: (id: string, delta: number) => Promise<void>;
  complete: (id: string) => Promise<void>;
  rewatch: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  notify: (message: string) => void;
};
let chain: Promise<void> = Promise.resolve();
let pendingPreferences: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let preferenceRevision = 0;
const preferenceChanges = new Map<keyof Preferences, number>();
export const useApp = create<Store>((set, get) => ({
  data: emptyData(),
  ready: false,
  error: "",
  notice: "",
  saving: false,
  init: () => {
    if (!initPromise)
      initPromise = repository
        .load()
        .then((data) => {
          set({ data, ready: true, error: "" });
        })
        .catch((e) => {
          set({ error: `Could not open your collection. ${String(e)}` });
          initPromise = null;
        });
    return initPromise;
  },
  mutate: (fn) => {
    // A collection mutation is an ordering boundary for preference writes.
    pendingPreferences = null;
    const job = chain.then(async () => {
      if (!get().ready) throw new Error("Your collection is not ready.");
      const next = fn(get().data);
      if (next === get().data) return;
      set({ saving: true });
      const previousRevision = preferenceRevision;
      const data = validateSnapshot(reconcilePublications(next));
      await repository.save(data);
      const concurrentPreferences = Object.fromEntries(
        [...preferenceChanges]
          .filter(([, revision]) => revision > previousRevision)
          .map(([key]) => [key, get().data.preferences[key]]),
      );
      set({
        data: {
          ...data,
          preferences: { ...data.preferences, ...concurrentPreferences },
        },
        saving: false,
        error: "",
      });
    });
    chain = job.catch((e) => {
      set({
        saving: false,
        error: `Changes were not saved. ${e instanceof Error ? e.message : String(e)}`,
      });
    });
    return chain;
  },
  prefs: (p) => {
    if (!get().ready) return Promise.resolve();
    const preferences = validatePreferences({
      ...get().data.preferences,
      ...p,
    });
    for (const key of Object.keys(p) as (keyof Preferences)[])
      preferenceChanges.set(key, ++preferenceRevision);
    set({ data: { ...get().data, preferences } });
    // Keep navigation immediate, but collapse queued writes to the latest state.
    if (pendingPreferences) return pendingPreferences;
    const job = chain.then(async () => {
      if (pendingPreferences === saved) pendingPreferences = null;
      await repository.savePreferences(get().data.preferences);
    });
    const saved = job.catch((e) =>
      set({ error: `Preferences were not saved. ${String(e)}` }),
    );
    pendingPreferences = saved;
    chain = saved;
    return saved;
  },
  add: (anime) =>
    get().mutate((d) =>
      d.entries.some((e) => e.anilistId === anime.anilistId)
        ? d
        : { ...d, entries: [createEntry(anime), ...d.entries] },
    ),
  addMany: (anime) =>
    get().mutate((d) => {
      const seen = new Set(d.entries.map((e) => e.anilistId));
      const added = anime
        .filter((a) => {
          if (seen.has(a.anilistId)) return false;
          seen.add(a.anilistId);
          return true;
        })
        .map((a) => createEntry(a));
      return { ...d, entries: [...added, ...d.entries] };
    }),
  edit: (entryId, patch) =>
    get().mutate((d) => {
      const old = d.entries.find((e) => e.localId === entryId);
      if (!old) return d;
      let updated = entrySchema.parse({ ...old, ...patch });
      if (
        patch.personalStatus === "Completed" &&
        old.personalStatus !== "Completed"
      )
        updated = completeEntry(updated);
      const events = [];
      if (
        patch.personalRating !== undefined &&
        patch.personalRating !== old.personalRating
      )
        events.push(
          event(
            entryId,
            "rating",
            patch.personalRating
              ? `Rated ${patch.personalRating / 2} stars`
              : "Rating removed",
          ),
        );
      if (patch.review !== undefined && patch.review !== old.review)
        events.push(event(entryId, "review", "Updated review"));
      if (
        updated.personalStatus === "Completed" &&
        old.personalStatus !== "Completed"
      )
        events.push(
          event(
            entryId,
            "completed",
            "Completed anime",
            updated.watchedEpisodes - old.watchedEpisodes,
          ),
        );
      if (
        updated.personalStatus === "Watching" &&
        old.personalStatus === "Planning"
      ) {
        updated = { ...updated, startedDate: now() };
        events.push(event(entryId, "started", "Started watching"));
      }
      return {
        ...d,
        entries: d.entries.map((e) => (e.localId === entryId ? updated : e)),
        history: [...events, ...d.history],
      };
    }),
  episodes: (entryId, n) =>
    get().mutate((d) => {
      const old = d.entries.find((e) => e.localId === entryId);
      if (!old) return d;
      const updated = setEpisodes(old, n);
      if (updated.watchedEpisodes === old.watchedEpisodes) return d;
      const events = [
        event(
          entryId,
          "episode",
          `Episode ${updated.watchedEpisodes}${updated.watchedEpisodes < old.watchedEpisodes ? " · corrected progress" : ""}`,
          updated.watchedEpisodes - old.watchedEpisodes,
        ),
      ];
      if (
        old.personalStatus === "Planning" &&
        updated.personalStatus === "Watching"
      )
        events.push(event(entryId, "started", "Started watching"));
      return {
        ...d,
        entries: d.entries.map((e) => (e.localId === entryId ? updated : e)),
        history: [...events, ...d.history],
      };
    }),
  complete: (entryId) => get().edit(entryId, { personalStatus: "Completed" }),
  adjustEpisodes: (entryId, delta) =>
    get().mutate((d) => {
      const old = d.entries.find((e) => e.localId === entryId);
      if (!old) return d;
      const updated = setEpisodes(old, old.watchedEpisodes + delta);
      if (updated.watchedEpisodes === old.watchedEpisodes) return d;
      const events = [
        event(
          entryId,
          "episode",
          `Episode ${updated.watchedEpisodes}${delta < 0 ? " · corrected progress" : ""}`,
          updated.watchedEpisodes - old.watchedEpisodes,
        ),
      ];
      if (
        old.personalStatus === "Planning" &&
        updated.personalStatus === "Watching"
      )
        events.push(event(entryId, "started", "Started watching"));
      return {
        ...d,
        entries: d.entries.map((e) => (e.localId === entryId ? updated : e)),
        history: [...events, ...d.history],
      };
    }),
  rewatch: (entryId) =>
    get().mutate((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.localId === entryId
          ? {
              ...e,
              personalStatus: "Rewatching",
              rewatchCount: e.rewatchCount + 1,
              watchedEpisodes: 0,
              startedDate: now(),
              completedDate: null,
            }
          : e,
      ),
      history: [event(entryId, "rewatch", "Started a rewatch"), ...d.history],
    })),
  remove: (entryId) =>
    get().mutate((d) => ({
      ...d,
      entries: d.entries.filter((e) => e.localId !== entryId),
      lists: d.lists.map((l) => ({
        ...l,
        entryIds: l.entryIds.filter((i) => i !== entryId),
        updatedAt: now(),
      })),
      profile: {
        ...d.profile,
        favoriteIds: d.profile.favoriteIds.filter((i) => i !== entryId),
      },
      history: d.history.filter((h) => h.entryId !== entryId),
    })),
  notify: (notice) => {
    set({ notice });
    setTimeout(() => {
      if (get().notice === notice) set({ notice: "" });
    }, 4000);
  },
}));
export function newList(title: string) {
  return {
    id: id(),
    publicId: id(),
    title,
    description: "",
    coverImage: "",
    entryIds: [],
    ranked: true,
    privacy: "Private" as const,
    shareThoughts: false,
    createdAt: now(),
    updatedAt: now(),
  };
}
