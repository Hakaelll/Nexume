import { useEffect, useState } from "react";
import { useApp } from "../app/store";
import { anilist } from "../services/anilist/provider";
// Refresh ongoing shows in one batch so cached next-airing dates do not become
// an indefinite availability ceiling after the next episode is released.
export function useRefreshEpisodes(active: boolean, now: number) {
  const entries = useApp((state) => state.data.entries);
  const ids = JSON.stringify(
    entries
      .filter(
        (entry) =>
          ["Planning", "Watching", "Rewatching"].includes(
            entry.personalStatus,
          ) &&
          entry.cachedMetadata.source !== "Sample" &&
          ["RELEASING", "NOT_YET_RELEASED", "HIATUS"].includes(
            entry.cachedMetadata.status ?? "",
          ) &&
          now - Date.parse(entry.cachedMetadata.fetchedAt) >= 15 * 60000,
      )
      .map((entry) => entry.anilistId)
      .sort((a, b) => a - b),
  );
  const interval = Math.floor(now / (15 * 60000));
  useEffect(() => {
    if (!active || ids === "[]" || !navigator.onLine) return;
    const controller = new AbortController();
    void anilist
      .byIds(JSON.parse(ids), controller.signal)
      .then(async (anime) => {
        if (controller.signal.aborted || !anime.length) return;
        const refreshed = new Map(anime.map((a) => [a.anilistId, a]));
        await useApp.getState().mutate((data) => ({
          ...data,
          entries: data.entries.map((entry) => {
            const metadata = refreshed.get(entry.anilistId);
            return metadata
              ? {
                  ...entry,
                  cachedMetadata: metadata,
                  lastMetadataRefresh: metadata.fetchedAt,
                  totalEpisodes:
                    metadata.episodes === null
                      ? entry.totalEpisodes
                      : Math.max(entry.watchedEpisodes, metadata.episodes),
                }
              : entry;
          }),
        }));
      })
      .catch(() => {
        /* Saved schedules remain usable offline. */
      });
    return () => controller.abort();
  }, [active, ids, interval]);
}
export function useClock(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    const id = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);
  return now;
}
export function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function calendarDays(cursor: Date, mode: "week" | "month") {
  const first =
    mode === "month"
      ? new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      : dayStart(cursor);
  const monday = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - ((first.getDay() + 6) % 7),
  );
  const count =
    mode === "week"
      ? 7
      : Math.ceil(
          (((first.getDay() + 6) % 7) +
            new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) /
            7,
        ) * 7;
  return Array.from(
    { length: count },
    (_, i) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );
}
export function useAiring(
  start: Date,
  end: Date,
  followedOnly = false,
  active = true,
) {
  const entries = useApp((state) => state.data.entries);
  const adult = useApp((state) => state.data.preferences.adultContent);
  const following = entries.filter((e) =>
    ["Planning", "Watching", "Rewatching"].includes(e.personalStatus),
  );
  const ids = followedOnly
    ? JSON.stringify(following.map((e) => e.anilistId).sort((a, b) => a - b))
    : "";
  const from = Math.floor(start.getTime() / 1000),
    to = Math.floor(end.getTime() / 1000);
  const [remote, setRemote] = useState<import("../domain/model").Anime[]>([]);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setRemote([]);
    setError("");
    if (!navigator.onLine) {
      setError("Offline · showing saved schedules");
      return;
    }
    setLoading(true);
    anilist
      .airing(from, to, ids ? JSON.parse(ids) : undefined, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setRemote(items);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Schedule unavailable · showing saved dates");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, ids, active]);
  const local = following.map((e) => ({
    ...e.cachedMetadata,
    coverImage: e.coverImage,
    coverLarge: e.coverImage,
  }));
  const seen = new Set<string>();
  const followedIds = new Set(following.map((e) => e.anilistId));
  const items = [...remote, ...local]
    .filter((a) => {
      const air = a.nextAiringEpisode;
      if (
        (followedOnly && !followedIds.has(a.anilistId)) ||
        !air ||
        air.airingAt < from ||
        air.airingAt >= to ||
        (!adult && a.isAdult)
      )
        return false;
      const key = `${a.anilistId}:${air.episode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) => a.nextAiringEpisode!.airingAt - b.nextAiringEpisode!.airingAt,
    );
  return { items, loading, error };
}
