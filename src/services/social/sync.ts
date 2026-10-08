import { type SyncJob, type AppData, id } from "../../domain/model";
import { useApp } from "../../app/store";
import { social } from "./provider";
import { coalesce } from "./reconcile";
export { coalesce } from "./reconcile";
export function failedJob(
  job: SyncJob,
  error: string,
  time = Date.now(),
): SyncJob {
  return {
    ...job,
    attempts: job.attempts + 1,
    error: error.slice(0, 1000),
    nextAttemptAt:
      time + Math.min(3600000, 5000 * 2 ** Math.min(job.attempts, 10)),
  };
}
export async function enqueue(
  publicId: string,
  kind: SyncJob["kind"],
  visibility: string,
  document: Record<string, unknown>,
  sourceId?: string,
) {
  const owner = await social.identity();
  if (!owner)
    throw new Error(
      "Sign in in Settings to publish this item. Your local changes are saved.",
    );
  const data = useApp.getState().data;
  const previous = data.preferences.publications.find(
    (p) => p.publicId === publicId,
  );
  if (previous && previous.ownerId !== owner.userId)
    throw new Error("This publication belongs to another account.");
  const source =
    sourceId ??
    (kind === "profile"
      ? data.profile.localId
      : data.lists.find((l) => l.publicId === publicId)?.id);
  if (!source) throw new Error("Publication source not found.");
  const revision = Math.max(Date.now(), (previous?.revision ?? 0) + 1);
  const content = visibility === "Private" ? null : { visibility, document };
  const publication = {
    publicId,
    sourceId: source,
    ownerId: owner.userId,
    kind,
    revision,
    signature: JSON.stringify(content),
  };
  const job: SyncJob = {
    id: id(),
    publicId,
    ownerId: owner.userId,
    kind,
    operation: visibility === "Private" ? "delete" : "publish",
    payload: content ?? {},
    revision,
    attempts: 0,
    nextAttemptAt: 0,
    error: "",
  };
  const result = await useApp.getState().mutate((d) => ({
    ...d,
    queue: coalesce(d.queue, job),
    preferences: {
      ...d.preferences,
      publications: [
        ...d.preferences.publications.filter((p) => p.publicId !== publicId),
        publication,
      ],
    },
  }));
  if (!result.ok) throw new Error(result.error);
}
let flushing = false;
export async function flushQueue(force = false) {
  if (flushing || !social.configured || !navigator.onLine) return;
  flushing = true;
  try {
    const owner = await social.identity();
    if (!owner) return;
    const jobs = useApp
      .getState()
      .data.queue.filter(
        (j) =>
          j.ownerId === owner.userId &&
          (force || j.nextAttemptAt <= Date.now()),
      );
    for (const job of jobs) {
      try {
        await social.publish(job);
        await useApp.getState().mutate((d: AppData) => ({
          ...d,
          queue: d.queue.filter((q) => q.id !== job.id),
        }));
      } catch (e) {
        await useApp.getState().mutate((d) => ({
          ...d,
          queue: d.queue.map((q) =>
            q.id === job.id ? failedJob(q, String(e)) : q,
          ),
        }));
      }
    }
  } finally {
    flushing = false;
  }
}
