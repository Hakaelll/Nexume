import { create } from "zustand";
import { reconcilePublications } from "../services/social/reconcile";
import { repository } from "../core/database/repository";
import {
  type AppData,
  type Anime,
  type Entry,
  type Preferences,
  emptyData,
  createEntry,
  stateSchema,
  entrySchema,
  preferencesSchema,
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
  edit: (id: string, patch: Partial<Entry>) => Promise<void>;
  episodes: (id: string, n: number) => Promise<void>;
  adjustEpisodes: (id: string, delta: number) => Promise<void>;
  complete: (id: string) => Promise<void>;
  rewatch: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  notify: (message: string) => void;
};
let chain: Promise<void> = Promise.resolve();
let initPromise: Promise<void> | null = null;
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
    const job = chain.then(async () => {
      if (!get().ready) throw new Error("Your collection is not ready.");
      set({ saving: true });
      const data = stateSchema.parse(reconcilePublications(fn(get().data)));
      await repository.save(data);
      set({ data, saving: false, error: "" });
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
    const job = chain.then(async () => {
      if (!get().ready) return;
      const preferences = preferencesSchema.parse({
        ...get().data.preferences,
        ...p,
      });
      await repository.savePreferences(preferences);
      set({ data: { ...get().data, preferences } });
    });
    chain = job.catch((e) =>
      set({ error: `Preferences were not saved. ${String(e)}` }),
    );
    return chain;
  },
  add: (anime) =>
    get().mutate((d) =>
      d.entries.some((e) => e.anilistId === anime.anilistId)
        ? d
        : { ...d, entries: [createEntry(anime), ...d.entries] },
    ),
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
