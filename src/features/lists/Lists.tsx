import { useState } from "react";
import {
  Plus,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  Lock,
  Check,
} from "lucide-react";
import { useApp, newList } from "../../app/store";
import {
  type Entry,
  type AnimeList,
  privacyValues,
  now,
} from "../../domain/model";
import { Artwork, Empty, Modal, PageTitle, Stars } from "../../components/ui";
import { social, publicLink } from "../../services/social/provider";
import { serializeList } from "../../services/social/serialization";
import { enqueue, flushQueue } from "../../services/social/sync";
import { loadListCover } from "./cover";
export default function Lists({ onOpen }: { onOpen: (e: Entry) => void }) {
  const store = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [share, setShare] = useState(false);
  const [link, setLink] = useState("");
  const [query, setQuery] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
  const list = store.data.lists.find((l) => l.id === selected);
  const patch = async (p: Partial<AnimeList>) => {
    if (!list) return;
    await store.mutate((d) => ({
      ...d,
      lists: d.lists.map((l) =>
        l.id === list.id ? { ...l, ...p, updatedAt: now() } : l,
      ),
    }));
  };
  const reorder = (from: number, to: number) => {
    if (!list || to < 0 || to >= list.entryIds.length) return;
    const next = [...list.entryIds];
    next.splice(to, 0, next.splice(from, 1)[0]);
    void patch({ entryIds: next });
  };
  const publish = async () => {
    if (!list) return;
    try {
      const snapshot =
        list.privacy === "Private" ? {} : serializeList(list, store.data);
      await enqueue(list.publicId, "list", list.privacy, snapshot);
      await flushQueue(true);
      if (list.privacy !== "Private") setLink(publicLink(list.publicId));
      store.notify(
        useApp.getState().data.queue.some((q) => q.publicId === list.publicId)
          ? "Pending sync. Local changes are saved."
          : list.privacy === "Private"
            ? "Publication removed."
            : "Published.",
      );
    } catch (e) {
      store.notify(String(e));
    }
  };
  return (
    <div className="page lists-page">
      {list ? (
        <>
          <button className="back-button" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} />
            All lists
          </button>
          <PageTitle
            kicker={`${list.ranked ? "RANKED" : "UNRANKED"} COLLECTION · ${list.privacy.toUpperCase()}`}
            title={list.title}
            subtitle={`${list.entryIds.length} titles · Curated by ${store.data.profile.displayName}`}
          >
            <button className="button" onClick={() => setShare(true)}>
              <Share2 size={15} />
              Share
            </button>
          </PageTitle>
          <div className="list-editor">
            <label className="field">
              Title
              <input
                value={list.title}
                maxLength={200}
                onChange={(e) => {
                  if (e.target.value) void patch({ title: e.target.value });
                }}
              />
            </label>
            <label className="field">
              Description
              <textarea
                value={list.description}
                rows={2}
                maxLength={5000}
                placeholder="List description"
                onChange={(e) => void patch({ description: e.target.value })}
              />
            </label>
            <div className="list-options">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={list.ranked}
                  onChange={(e) => void patch({ ranked: e.target.checked })}
                />
                Ranked list
              </label>
              <label className="select-field">
                Visibility
                <select
                  value={list.privacy}
                  onChange={(e) =>
                    void patch({
                      privacy: e.target.value as AnimeList["privacy"],
                    })
                  }
                >
                  {privacyValues.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button className="button" onClick={() => setAdding(true)}>
                <Plus size={15} />
                Add titles
              </button>
            </div>
            <div className="list-cover-editor">
              {list.coverImage && (
                <Artwork
                  src={list.coverImage}
                  title={`${list.title} cover preview`}
                  eager
                />
              )}
              <div className="list-cover-fields">
                <label className="field">
                  Upload cover photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={coverBusy}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      setCoverBusy(true);
                      setCoverError("");
                      try {
                        const coverImage = await loadListCover(file);
                        await patch({ coverImage });
                        store.notify("List cover saved.");
                      } catch (error) {
                        setCoverError(
                          error instanceof Error
                            ? error.message
                            : "Could not save this image.",
                        );
                      } finally {
                        setCoverBusy(false);
                      }
                    }}
                  />
                  <small>JPG, PNG or WebP · up to 10 MB</small>
                </label>
                <label className="field">
                  Cover URL <small>optional</small>
                  <input
                    key={`${list.id}:${list.coverImage}`}
                    type="url"
                    disabled={coverBusy}
                    defaultValue={
                      list.coverImage.startsWith("data:") ? "" : list.coverImage
                    }
                    placeholder="https://…"
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (!value && list.coverImage.startsWith("data:")) return;
                      if (value === list.coverImage) return;
                      void patch({ coverImage: value }).catch(() =>
                        setCoverError(
                          "Could not save this cover URL. Use an HTTPS image URL.",
                        ),
                      );
                    }}
                  />
                </label>
                {list.coverImage && (
                  <button
                    className="text-button"
                    disabled={coverBusy}
                    onClick={() => {
                      setCoverError("");
                      void patch({ coverImage: "" }).catch(() =>
                        setCoverError("Could not remove this cover."),
                      );
                    }}
                  >
                    <Trash2 size={14} /> Remove cover
                  </button>
                )}
                {coverBusy && <p role="status">Saving cover…</p>}
                {coverError && <p role="alert">{coverError}</p>}
              </div>
            </div>
          </div>
          {list.entryIds.length ? (
            <div className="ranked-list">
              {list.entryIds.map((entryId, i) => {
                const e = store.data.entries.find(
                  (e) => e.localId === entryId,
                )!;
                return (
                  <article
                    draggable
                    key={e.localId}
                    onDragStart={() => setDragged(e.localId)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => {
                      if (dragged) reorder(list.entryIds.indexOf(dragged), i);
                      setDragged(null);
                    }}
                  >
                    <GripVertical size={15} className="muted" />
                    <span className="rank">
                      {list.ranked ? String(i + 1).padStart(2, "0") : "—"}
                    </span>
                    <button className="ranked-cover" onClick={() => onOpen(e)}>
                      <Artwork src={e.coverImage} title={e.preferredTitle} />
                    </button>
                    <div className="ranked-info">
                      <button onClick={() => onOpen(e)}>
                        {e.preferredTitle}
                      </button>
                      <p className="prose">
                        {e.shortOpinion || e.cachedMetadata.year}
                      </p>
                    </div>
                    <Stars value={e.personalRating} />
                    <button
                      className="icon-button"
                      aria-label={`Move ${e.preferredTitle} up`}
                      disabled={i === 0}
                      onClick={() => reorder(i, i - 1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${e.preferredTitle} down`}
                      disabled={i === list.entryIds.length - 1}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${e.preferredTitle} from list`}
                      onClick={() =>
                        void patch({
                          entryIds: list.entryIds.filter(
                            (id) => id !== e.localId,
                          ),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty
              title="No anime in this list"
              text="Choose anime from your library, then arrange them your way."
              action="Add titles"
              onAction={() => setAdding(true)}
            />
          )}
          <button
            className="text-button delete-list"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
            Delete list
          </button>
        </>
      ) : (
        <>
          <PageTitle title="Lists">
            <button
              className="button primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} />
              Create a list
            </button>
          </PageTitle>
          {store.data.lists.length ? (
            <div className="lists-grid">
              {store.data.lists.map((l) => (
                <button
                  className="list-card"
                  key={l.id}
                  onClick={() => setSelected(l.id)}
                >
                  <div className="list-covers">
                    {l.coverImage ? (
                      <Artwork src={l.coverImage} title={l.title} />
                    ) : l.entryIds.length ? (
                      l.entryIds.slice(0, 4).map((eid) => {
                        const e = store.data.entries.find(
                          (e) => e.localId === eid,
                        )!;
                        return (
                          <Artwork
                            key={eid}
                            src={e.coverImage}
                            title={e.preferredTitle}
                          />
                        );
                      })
                    ) : (
                      <span className="prose">No cover</span>
                    )}
                  </div>
                  <span className="eyebrow">
                    {l.ranked ? "RANKED" : "COLLECTION"} · {l.entryIds.length}{" "}
                    TITLES
                  </span>
                  <h2>{l.title}</h2>
                  <p>{l.description || ""}</p>
                  <span className="list-privacy">
                    <Lock size={12} />
                    {l.privacy}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="No lists yet"
              text="Start a list for a theme, a feeling, or your all-time favorites."
              action="Create your first list"
              onAction={() => setCreating(true)}
            />
          )}
        </>
      )}
      {creating && (
        <Modal title="Create a list" onClose={() => setCreating(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const l = newList(title.trim());
              void store
                .mutate((d) => ({ ...d, lists: [l, ...d.lists] }))
                .then(() => {
                  setCreating(false);
                  setSelected(l.id);
                  setTitle("");
                });
            }}
          >
            <label className="field">
              List title
              <input
                autoFocus
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Anime for quiet nights"
              />
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={!title.trim()}>
                Create list
              </button>
            </div>
          </form>
        </Modal>
      )}
      {adding && list && (
        <Modal
          title="Choose from your library"
          onClose={() => setAdding(false)}
          wide
        >
          <label className="field">
            Find an anime
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library"
            />
          </label>
          <div className="picker-list">
            {store.data.entries
              .filter((e) =>
                e.preferredTitle.toLowerCase().includes(query.toLowerCase()),
              )
              .map((e) => (
                <button
                  aria-label={e.preferredTitle}
                  key={e.localId}
                  onClick={() =>
                    void patch({
                      entryIds: list.entryIds.includes(e.localId)
                        ? list.entryIds.filter((i) => i !== e.localId)
                        : [...list.entryIds, e.localId],
                    })
                  }
                >
                  <Artwork src={e.coverImage} title={e.preferredTitle} />
                  <span>{e.preferredTitle}</span>
                  {list.entryIds.includes(e.localId) ? (
                    <Check size={17} />
                  ) : (
                    <Plus size={17} />
                  )}
                </button>
              ))}
          </div>
          <button className="button full" onClick={() => setAdding(false)}>
            Done
          </button>
        </Modal>
      )}
      {confirmDelete && list && (
        <Modal
          title={`Delete “${list.title}”?`}
          onClose={() => setConfirmDelete(false)}
        >
          <p className="prose">
            Your anime stay in your library. If this list was published, its
            removal is queued automatically.
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setConfirmDelete(false)}>
              Keep list
            </button>
            <button
              className="button"
              onClick={() => {
                void store.mutate((d) => ({
                  ...d,
                  lists: d.lists.filter((l) => l.id !== list.id),
                }));
                setConfirmDelete(false);
                setSelected(null);
              }}
            >
              Delete local list
            </button>
          </div>
        </Modal>
      )}
      {share && list && (
        <Modal title="Share this collection" onClose={() => setShare(false)}>
          <p className="prose">
            Publish only what you choose. Private notes are always excluded.
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={list.shareThoughts}
              onChange={(e) => void patch({ shareThoughts: e.target.checked })}
            />
            Include quick thoughts in this shared list
          </label>
          <p className="muted">
            Visibility: {list.privacy}. First publication is explicit. Later
            changes to a published list queue automatically.
          </p>
          {social.configured ? (
            <button className="button primary" onClick={() => void publish()}>
              {list.privacy === "Private"
                ? "Remove online publication"
                : "Publish update"}
            </button>
          ) : (
            <p className="configuration-note">
              Online sharing: Not configured. See Settings and
              SOCIAL_ARCHITECTURE.md.
            </p>
          )}
          {link && (
            <div className="share-link">
              <input readOnly aria-label="Share link" value={link} />
              <button
                className="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => store.notify("Link copied."))
                }
              >
                <Copy size={14} />
                Copy link
              </button>
              <a
                className="button"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} />
                Open public view
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
