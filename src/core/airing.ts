import { useEffect, useState } from "react";
import { useApp } from "../app/store";
import { anilist } from "../services/anilist/provider";
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
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
export function useAiring(start: Date, end: Date, followedOnly = false) {
  const { data } = useApp();
  const following = data.entries.filter((e) =>
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
  const adult = data.preferences.adultContent;
  useEffect(() => {
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
  }, [from, to, ids]);
  const local = following.map((e) => ({
    ...e.cachedMetadata,
    coverImage: e.coverImage,
    coverLarge: e.coverImage,
  }));
  const seen = new Set<string>();
  const items = [...remote, ...local]
    .filter((a) => {
      const air = a.nextAiringEpisode;
      if (
        (followedOnly && !following.some((e) => e.anilistId === a.anilistId)) ||
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
