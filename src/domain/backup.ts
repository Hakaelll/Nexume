import { z } from "zod";
import { stateSchema, type AppData, now } from "./model";
const backupSchema = z.object({
  backupVersion: z.literal(1),
  exportedAt: z.string(),
  data: stateSchema,
});
export function exportBackup(data: AppData) {
  return JSON.stringify(
    {
      backupVersion: 1,
      exportedAt: now(),
      data: {
        ...data,
        queue: [],
        preferences: { ...data.preferences, publications: [] },
      },
    },
    null,
    2,
  );
}
export function parseBackup(raw: string): AppData {
  if (raw.length > 25 * 1024 * 1024) throw new Error("Backup exceeds 25 MB.");
  try {
    return backupSchema.parse(JSON.parse(raw)).data;
  } catch (e) {
    throw new Error(
      `This is not a valid Nexume v1 backup. ${e instanceof Error ? e.message.slice(0, 300) : ""}`,
    );
  }
}
export function mergeBackup(current: AppData, incoming: AppData): AppData {
  const byAnime = new Map(current.entries.map((e) => [e.anilistId, e.localId]));
  const byId = new Map(current.entries.map((e) => [e.localId, e.anilistId]));
  const remap = new Map<string, string>();
  const added = incoming.entries.filter((e) => {
    const existing = byAnime.get(e.anilistId);
    if (existing) {
      remap.set(e.localId, existing);
      return false;
    }
    if (byId.has(e.localId))
      throw new Error(
        "Conflicting local IDs. Restore into a separate profile.",
      );
    return true;
  });
  const lists = incoming.lists
    .filter(
      (l) =>
        !current.lists.some((c) => c.id === l.id || c.publicId === l.publicId),
    )
    .map((l) => ({
      ...l,
      privacy: "Private" as const,
      entryIds: [...new Set(l.entryIds.map((i) => remap.get(i) ?? i))],
    }));
  const history = incoming.history
    .filter((h) => !current.history.some((c) => c.id === h.id))
    .map((h) => ({ ...h, entryId: remap.get(h.entryId) ?? h.entryId }));
  return stateSchema.parse({
    ...current,
    entries: [...current.entries, ...added],
    lists: [...current.lists, ...lists],
    history: [...current.history, ...history],
  });
}
export function exportCsv(data: AppData) {
  const cell = (v: unknown) => {
    let t = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replaceAll('"', '""')}"`;
  };
  return [
    [
      "Title",
      "AniList ID",
      "Status",
      "Episodes watched",
      "Episodes total",
      "Stars",
      "Like",
      "Quick thought",
    ],
    ...data.entries.map((e) => [
      e.preferredTitle,
      e.anilistId,
      e.personalStatus,
      e.watchedEpisodes,
      e.totalEpisodes,
      e.personalRating === null ? "" : e.personalRating / 2,
      e.liked,
      e.shortOpinion,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
