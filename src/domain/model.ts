import { z } from "zod";

export const statuses = [
  "Planning",
  "Watching",
  "Completed",
  "Paused",
  "Dropped",
  "Rewatching",
] as const;
export const privacyValues = ["Private", "Unlisted", "Public"] as const;
const date = z.string().max(40);
const text = (max: number) => z.string().max(max);
const remoteImage = z
  .string()
  .max(2048)
  .refine(
    (v) => !v || /^https:\/\//.test(v) || /^\/demo\/[a-z0-9.-]+$/i.test(v),
    "Invalid image URL",
  );
export const metadataSchema = z.object({
  source: z.enum(["AniList", "Sample"]).default("AniList"),
  anilistId: z.number().int().positive(),
  romaji: text(500),
  english: text(500).nullable(),
  native: text(500).nullable(),
  synonyms: z.array(text(500)).max(100),
  coverImage: remoteImage,
  coverLarge: remoteImage,
  bannerImage: remoteImage,
  description: text(50000),
  averageScore: z.number().min(0).max(100).nullable(),
  popularity: z.number().nonnegative().nullable(),
  favorites: z.number().nonnegative().nullable(),
  episodes: z.number().int().nonnegative().nullable(),
  duration: z.number().nonnegative().nullable(),
  format: text(50).nullable(),
  status: text(50).nullable(),
  season: text(20).nullable(),
  year: z.number().int().nullable(),
  startDate: date.nullable(),
  endDate: date.nullable(),
  genres: z.array(text(100)).max(100),
  tags: z.array(text(100)).max(200),
  studios: z.array(text(200)).max(100),
  country: text(10).nullable(),
  trailer: z.object({ id: text(200), site: text(100) }).nullable(),
  nextAiringEpisode: z
    .object({ episode: z.number().int(), airingAt: z.number().int() })
    .nullable(),
  isAdult: z.boolean(),
  fetchedAt: date,
});
export type Anime = z.infer<typeof metadataSchema>;
export const entrySchema = z
  .object({
    localId: z.string().uuid(),
    anilistId: z.number().int().positive(),
    preferredTitle: text(500),
    coverImage: remoteImage,
    bannerImage: remoteImage,
    personalStatus: z.enum(statuses),
    watchedEpisodes: z.number().int().min(0).max(100000),
    totalEpisodes: z.number().int().nonnegative().nullable(),
    personalRating: z.number().int().min(1).max(10).nullable(),
    liked: z.boolean(),
    favorite: z.boolean(),
    shortOpinion: text(500),
    review: text(100000),
    reviewContainsSpoilers: z.boolean(),
    reviewPrivacy: z.enum(privacyValues),
    privateNotes: text(100000),
    watchedDate: date.nullable(),
    startedDate: date.nullable(),
    completedDate: date.nullable(),
    lastWatchedDate: date.nullable(),
    addedDate: date,
    rewatchCount: z.number().int().min(0).max(10000),
    priority: z.number().int().min(0).max(3),
    personalTags: z.array(text(80)).max(50),
    cachedMetadata: metadataSchema,
    lastMetadataRefresh: date,
  })
  .refine(
    (e) => e.anilistId === e.cachedMetadata.anilistId,
    "Metadata ID mismatch",
  )
  .refine(
    (e) => e.totalEpisodes === null || e.watchedEpisodes <= e.totalEpisodes,
    "Progress exceeds total episodes",
  );
export type Entry = z.infer<typeof entrySchema>;
export const listSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().uuid(),
  title: text(200).min(1),
  description: text(5000),
  coverImage: z.union([
    remoteImage,
    z
      .string()
      .max(200000)
      .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
  ]),
  entryIds: z.array(z.string().uuid()).max(10000),
  ranked: z.boolean(),
  privacy: z.enum(privacyValues),
  shareThoughts: z.boolean(),
  createdAt: date,
  updatedAt: date,
});
export type AnimeList = z.infer<typeof listSchema>;
export const profileSchema = z.object({
  localId: z.string().uuid(),
  publicId: z.string().uuid(),
  username: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  displayName: text(100),
  avatar: z.union([
    remoteImage,
    z
      .string()
      .max(200000)
      .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
  ]),
  bio: text(2000),
  createdAt: date,
  favoriteIds: z.array(z.string().uuid()).max(6),
  privacy: z.enum(privacyValues),
});
export type LocalUser = z.infer<typeof profileSchema>;
export interface OnlineIdentity {
  userId: string;
  email: string;
}
export const historySchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  at: date,
  kind: z.enum([
    "episode",
    "started",
    "completed",
    "rewatch",
    "rating",
    "review",
  ]),
  detail: text(500),
  episodeDelta: z.number().int().default(0),
});
export type DiaryEvent = z.infer<typeof historySchema>;
const preferencesBaseSchema = z.object({
  section: z
    .enum([
      "Home",
      "Library",
      "Watchlist",
      "Recommend",
      "Discover",
      "Diary",
      "Calendar",
      "Lists",
      "Profile",
      "Stats",
      "Settings",
    ])
    .default("Home"),
  view: z.enum(["Collection", "Grid", "List"]).default("Collection"),
  selectedId: z.string().default(""),
  filter: z.string().default("All"),
  search: z.string().default(""),
  sort: z.string().default("added"),
  descending: z.boolean().default(true),
  gridSize: z.number().min(130).max(260).default(180),
  quality: z.enum(["High", "Balanced", "Low"]).default("Balanced"),
  reducedMotion: z.boolean().default(false),
  motionMode: z.enum(["system", "full", "reduced"]).default("system"),
  diagnostics: z.boolean().default(false),
  adultContent: z.boolean().default(false),
  columns: z
    .array(z.string())
    .default(["status", "episodes", "rating", "community", "year"]),
  year: z.string().default(""),
  genre: z.string().default(""),
  format: z.string().default(""),
  studio: z.string().default(""),
  season: z.string().default(""),
  tag: z.string().default(""),
  minRating: z.number().min(0).max(10).default(0),
  scrollTop: z.number().min(0).default(0),
});
export const publicationSchema = z.object({
  publicId: z.string().uuid(),
  sourceId: z.string().uuid(),
  ownerId: z.string().uuid(),
  kind: z.enum(["list", "profile", "review"]),
  revision: z.number().int(),
  signature: z.string().max(3000000),
});
export const preferencesSchema = preferencesBaseSchema.extend({
  publications: z.array(publicationSchema).max(5000).default([]),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const queueSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().uuid(),
  ownerId: z.string().uuid(),
  kind: z.enum(["list", "profile", "review"]),
  operation: z.enum(["publish", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  revision: z.number().int(),
  attempts: z.number().int().min(0),
  nextAttemptAt: z.number(),
  error: text(1000),
});
export type SyncJob = z.infer<typeof queueSchema>;
export const stateSchema = z
  .object({
    entries: z.array(entrySchema).max(10000),
    lists: z.array(listSchema).max(2000),
    profile: profileSchema,
    history: z.array(historySchema).max(200000),
    preferences: preferencesSchema,
    queue: z.array(queueSchema).max(5000),
    searchHistory: z.array(text(200)).max(20),
  })
  .superRefine((s, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const unique = (values: (string | number)[], label: string) => {
      if (new Set(values).size !== values.length) issue(`Duplicate ${label}`);
    };
    unique(
      s.entries.map((e) => e.localId),
      "entry IDs",
    );
    unique(
      s.entries.map((e) => e.anilistId),
      "AniList IDs",
    );
    unique(
      s.lists.map((l) => l.id),
      "list IDs",
    );
    unique(
      s.lists.map((l) => l.publicId),
      "public IDs",
    );
    unique(
      s.history.map((h) => h.id),
      "history IDs",
    );
    const ids = new Set(s.entries.map((e) => e.localId));
    for (const l of s.lists) {
      unique(l.entryIds, "list members");
      if (l.entryIds.some((id) => !ids.has(id)))
        issue("List references missing anime");
    }
    unique(s.profile.favoriteIds, "favorites");
    if (s.profile.favoriteIds.some((id) => !ids.has(id)))
      issue("Favorite references missing anime");
    if (s.history.some((h) => !ids.has(h.entryId)))
      issue("Diary references missing anime");
  });
export type AppData = z.infer<typeof stateSchema>;
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export function emptyData(): AppData {
  return {
    entries: [],
    lists: [],
    history: [],
    queue: [],
    searchHistory: [],
    preferences: preferencesSchema.parse({}),
    profile: {
      localId: id(),
      publicId: id(),
      username: "collector",
      displayName: "Your collection",
      avatar: "",
      bio: "",
      createdAt: now(),
      favoriteIds: [],
      privacy: "Private",
    },
  };
}
export function createEntry(
  anime: Anime,
  status: Entry["personalStatus"] = "Planning",
): Entry {
  return entrySchema.parse({
    localId: id(),
    anilistId: anime.anilistId,
    preferredTitle: anime.english || anime.romaji,
    coverImage: anime.coverImage,
    bannerImage: anime.bannerImage,
    personalStatus: status,
    watchedEpisodes: 0,
    totalEpisodes: anime.episodes,
    personalRating: null,
    liked: false,
    favorite: false,
    shortOpinion: "",
    review: "",
    reviewContainsSpoilers: false,
    reviewPrivacy: "Private",
    privateNotes: "",
    watchedDate: null,
    startedDate: status === "Watching" ? now() : null,
    completedDate: null,
    lastWatchedDate: null,
    addedDate: now(),
    rewatchCount: 0,
    priority: 0,
    personalTags: [],
    cachedMetadata: anime,
    lastMetadataRefresh: anime.fetchedAt,
  });
}
