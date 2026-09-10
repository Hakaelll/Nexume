import { describe, it, expect } from "vitest";
import {
  emptyData,
  createEntry,
  id,
  now,
  type SyncJob,
} from "../src/domain/model";
import { mapAnime } from "../src/services/anilist/provider";
import {
  serializeList,
  serializeProfile,
  serializeReview,
} from "../src/services/social/serialization";
import {
  coalesce,
  reconcilePublications,
} from "../src/services/social/reconcile";
import { exportBackup, parseBackup } from "../src/domain/backup";
function fixture() {
  const d = emptyData();
  d.entries = [
    {
      ...createEntry(mapAnime({ id: 1, title: { romaji: "Story" } })),
      shortOpinion: "A thought",
      privateNotes: "NEVER PUBLISH",
      review: "Review",
      reviewPrivacy: "Public",
      personalRating: 9,
    },
  ];
  d.lists = [
    {
      id: id(),
      publicId: id(),
      title: "Favorites",
      description: "A mood",
      coverImage: "",
      entryIds: [d.entries[0].localId],
      ranked: true,
      privacy: "Public",
      shareThoughts: false,
      createdAt: now(),
      updatedAt: now(),
    },
  ];
  return d;
}
describe("explicit public serialization", () => {
  it("excludes notes, local IDs and thoughts without opt-in", () => {
    const d = fixture();
    const out = JSON.stringify(serializeList(d.lists[0], d));
    expect(out).not.toContain("NEVER PUBLISH");
    expect(out).not.toContain(d.entries[0].localId);
    expect(out).not.toContain("A thought");
    d.lists[0].shareThoughts = true;
    expect(JSON.stringify(serializeList(d.lists[0], d))).toContain("A thought");
  });
  it("rejects private lists, profiles and reviews", () => {
    const d = fixture();
    d.lists[0].privacy = "Private";
    d.entries[0].reviewPrivacy = "Private";
    expect(() => serializeList(d.lists[0], d)).toThrow();
    expect(() => serializeProfile(d)).toThrow();
    expect(() => serializeReview(d.entries[0], d)).toThrow();
  });
  it("keeps spoiler flags and public review fields but excludes private notes", () => {
    const d = fixture();
    d.entries[0].reviewContainsSpoilers = true;
    const r = serializeReview(d.entries[0], d);
    expect(r.spoiler).toBe(true);
    expect(r.review).toBe("Review");
    expect(JSON.stringify(r)).not.toContain("NEVER PUBLISH");
  });
  it("does not reveal unlisted or private lists from public profiles", () => {
    const d = fixture();
    d.profile.privacy = "Public";
    d.lists[0].privacy = "Unlisted";
    expect(serializeProfile(d).lists).toEqual([]);
  });
  it("queues only opted-in publications, coalesces updates, and revokes privacy", () => {
    let d = fixture();
    expect(reconcilePublications(d).queue).toHaveLength(0);
    d.preferences.publications = [
      {
        publicId: d.lists[0].publicId,
        sourceId: d.lists[0].id,
        ownerId: id(),
        kind: "list",
        revision: 1,
        signature: "",
      },
    ];
    d = reconcilePublications(d, 100);
    expect(d.queue).toHaveLength(1);
    expect(d.queue[0].operation).toBe("publish");
    const owner = d.queue[0].ownerId;
    d.lists[0].description = "Edited";
    d = reconcilePublications(d, 101);
    expect(d.queue).toHaveLength(1);
    expect(d.queue[0].revision).toBe(101);
    expect(d.queue[0].ownerId).toBe(owner);
    d.lists[0].privacy = "Private";
    d = reconcilePublications(d, 102);
    expect(d.queue[0].operation).toBe("delete");
    expect(d.queue[0].payload).toEqual({});
  });
  it("queues remote removal when a published list is deleted locally", () => {
    let d = fixture();
    d.preferences.publications = [
      {
        publicId: d.lists[0].publicId,
        sourceId: d.lists[0].id,
        ownerId: id(),
        kind: "list",
        revision: 1,
        signature: "",
      },
    ];
    d = reconcilePublications(d);
    d.lists = [];
    expect(reconcilePublications(d).queue[0].operation).toBe("delete");
  });
  it("does not merge queue ownership across accounts", () => {
    const base: SyncJob = {
      id: id(),
      publicId: id(),
      ownerId: id(),
      kind: "list",
      operation: "delete",
      payload: {},
      revision: 1,
      attempts: 0,
      nextAttemptAt: 0,
      error: "",
    };
    const other = { ...base, id: id(), ownerId: id() };
    expect(coalesce([base], other)).toHaveLength(2);
  });
  it("never exports publication credentials or pending public payloads", () => {
    let d = fixture();
    d.preferences.publications = [
      {
        publicId: d.lists[0].publicId,
        sourceId: d.lists[0].id,
        ownerId: id(),
        kind: "list",
        revision: 1,
        signature: "",
      },
    ];
    d = reconcilePublications(d);
    const backup = parseBackup(exportBackup(d));
    expect(backup.queue).toEqual([]);
    expect(backup.preferences.publications).toEqual([]);
  });
});
