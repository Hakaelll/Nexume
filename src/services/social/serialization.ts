import { type AppData, type AnimeList, type Entry } from "../../domain/model";
export function publicAnime(e: Entry, thoughts = false) {
  return {
    anilistId: e.anilistId,
    title: e.preferredTitle,
    cover: e.coverImage.startsWith("https:") ? e.coverImage : "",
    year: e.cachedMetadata.year,
    rating: e.personalRating,
    liked: e.liked,
    ...(thoughts ? { thought: e.shortOpinion } : {}),
  };
}
export function serializeList(list: AnimeList, data: AppData) {
  if (list.privacy === "Private")
    throw new Error("Private lists cannot be published.");
  return {
    kind: "list",
    title: list.title,
    description: list.description,
    cover: list.coverImage,
    ranked: list.ranked,
    author: {
      username: data.profile.username,
      displayName: data.profile.displayName,
    },
    items: list.entryIds.flatMap((i) => {
      const e = data.entries.find((e) => e.localId === i);
      return e ? [publicAnime(e, list.shareThoughts)] : [];
    }),
  };
}
export function serializeProfile(data: AppData) {
  if (data.profile.privacy === "Private")
    throw new Error("Private profiles cannot be published.");
  return {
    kind: "profile",
    title: data.profile.displayName,
    username: data.profile.username,
    bio: data.profile.bio,
    avatar: data.profile.avatar,
    createdAt: data.profile.createdAt,
    items: data.profile.favoriteIds.flatMap((i) => {
      const e = data.entries.find((e) => e.localId === i);
      return e ? [publicAnime(e)] : [];
    }),
    lists: data.lists
      .filter((l) => l.privacy === "Public")
      .map((l) => ({ title: l.title, publicId: l.publicId })),
    counts: {
      anime: data.entries.length,
      reviews: data.entries.filter(
        (e) => e.review && e.reviewPrivacy === "Public",
      ).length,
      lists: data.lists.filter((l) => l.privacy === "Public").length,
    },
  };
}
export function serializeReview(entry: Entry, data: AppData) {
  if (entry.reviewPrivacy === "Private")
    throw new Error("Private reviews cannot be published.");
  return {
    kind: "review",
    title: entry.preferredTitle,
    author: {
      username: data.profile.username,
      displayName: data.profile.displayName,
    },
    items: [publicAnime(entry, true)],
    review: entry.review,
    spoiler: entry.reviewContainsSpoilers,
    watchedDate: entry.watchedDate,
    rewatch: entry.rewatchCount > 0,
  };
}
