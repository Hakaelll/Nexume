import {
  type AppData,
  type SyncJob,
  type Preferences,
  id,
} from "../../domain/model";
import {
  serializeList,
  serializeProfile,
  serializeReview,
} from "./serialization";
export function publicationContent(
  data: AppData,
  publication: Preferences["publications"][number],
) {
  if (publication.kind === "list") {
    const item = data.lists.find((l) => l.id === publication.sourceId);
    return item && item.privacy !== "Private"
      ? { visibility: item.privacy, document: serializeList(item, data) }
      : null;
  }
  if (publication.kind === "profile")
    return data.profile.localId === publication.sourceId &&
      data.profile.privacy !== "Private"
      ? { visibility: data.profile.privacy, document: serializeProfile(data) }
      : null;
  const item = data.entries.find((e) => e.localId === publication.sourceId);
  return item && item.reviewPrivacy !== "Private"
    ? { visibility: item.reviewPrivacy, document: serializeReview(item, data) }
    : null;
}
export function coalesce(queue: SyncJob[], job: SyncJob) {
  return [
    ...queue.filter(
      (q) => q.publicId !== job.publicId || q.ownerId !== job.ownerId,
    ),
    job,
  ];
}
export function reconcilePublications(
  data: AppData,
  time = Date.now(),
): AppData {
  let queue = data.queue;
  const publications = data.preferences.publications.map((publication) => {
    const content = publicationContent(data, publication);
    const signature = JSON.stringify(content);
    if (signature === publication.signature) return publication;
    const revision = Math.max(time, publication.revision + 1);
    const job: SyncJob = {
      id: id(),
      publicId: publication.publicId,
      ownerId: publication.ownerId,
      kind: publication.kind,
      operation: content ? "publish" : "delete",
      payload: content ?? {},
      revision,
      attempts: 0,
      nextAttemptAt: 0,
      error: "",
    };
    queue = coalesce(queue, job);
    return { ...publication, signature, revision };
  });
  return { ...data, queue, preferences: { ...data.preferences, publications } };
}
