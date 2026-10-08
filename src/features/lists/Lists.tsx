import { t, useLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useState } from "react";
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
  useLanguage();
  const store = useApp(
    useShallow((state) => ({
      data: state.data,
      prefs: state.prefs,
      mutate: state.mutate,
      add: state.add,
      addMany: state.addMany,
      edit: state.edit,
      remove: state.remove,
      episodes: state.episodes,
      adjustEpisodes: state.adjustEpisodes,
      complete: state.complete,
      rewatch: state.rewatch,
      notify: state.notify,
    })),
  );
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
  const [draft, setDraft] = useState({ title: "", description: "" });
  useEffect(() => {
    const selectedList = useApp
      .getState()
      .data.lists.find((l) => l.id === selected);
    setDraft({
      title: selectedList?.title ?? "",
      description: selectedList?.description ?? "",
    });
  }, [selected]);
  const patch = async (p: Partial<AnimeList>, throwOnFailure = false) => {
    if (!list) return;
    const result = await store.mutate((d) => ({
      ...d,
      lists: d.lists.map((l) =>
        l.id === list.id ? { ...l, ...p, updatedAt: now() } : l,
      ),
    }));
    if (!result.ok && throwOnFailure) throw new Error(result.error);
    return result;
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
            <ArrowLeft size={16} /> {t("All lists")}{" "}
          </button>
          <PageTitle
            kicker={t("{value0} COLLECTION · {value1}", {
              value0: list.ranked ? "RANKED" : "UNRANKED",
              value1: list.privacy.toUpperCase(),
            })}
            title={list.title}
            subtitle={t("{value0} titles · Curated by {value1}", {
              value0: list.entryIds.length,
              value1: store.data.profile.displayName,
            })}
          >
            <button className="button" onClick={() => setShare(true)}>
              <Share2 size={15} /> {t("Share")}{" "}
            </button>
          </PageTitle>
          <div className="list-editor">
            <label className="field">
              {" "}
              {t("Title")}{" "}
              <input
                value={draft.title}
                maxLength={200}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, title: e.target.value }));
                  if (e.target.value) void patch({ title: e.target.value });
                }}
              />
            </label>
            <label className="field">
              {" "}
              {t("Description")}{" "}
              <textarea
                value={draft.description}
                rows={2}
                maxLength={5000}
                placeholder={t("List description")}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, description: e.target.value }));
                  void patch({ description: e.target.value });
                }}
              />
            </label>
            <div className="list-options">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={list.ranked}
                  onChange={(e) => void patch({ ranked: e.target.checked })}
                />{" "}
                {t("Ranked list")}{" "}
              </label>
              <label className="select-field">
                {" "}
                {t("Visibility")}{" "}
                <select
                  value={list.privacy}
                  onChange={(e) =>
                    void patch({
                      privacy: e.target.value as AnimeList["privacy"],
                    })
                  }
                >
                  {privacyValues.map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" onClick={() => setAdding(true)}>
                <Plus size={15} /> {t("Add titles")}{" "}
              </button>
            </div>
            <div className="list-cover-editor">
              {list.coverImage && (
                <Artwork
                  src={list.coverImage}
                  title={t("{value0} cover preview", { value0: list.title })}
                  eager
                />
              )}
              <div className="list-cover-fields">
                <label className="field">
                  {" "}
                  {t("Upload cover photo")}{" "}
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
                        await patch({ coverImage }, true);
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
                  <small>{t("JPG, PNG or WebP · up to 10 MB")}</small>
                </label>
                <label className="field">
                  {" "}
                  {t("Cover URL")} <small>{t("optional")}</small>
                  <input
                    key={`${list.id}:${list.coverImage}`}
                    type="url"
                    disabled={coverBusy}
                    defaultValue={
                      list.coverImage.startsWith("data:") ? "" : list.coverImage
                    }
                    placeholder={t("https://…")}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (!value && list.coverImage.startsWith("data:")) return;
                      if (value === list.coverImage) return;
                      void patch({ coverImage: value }, true).catch(() =>
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
                      void patch({ coverImage: "" }, true).catch(() =>
                        setCoverError("Could not remove this cover."),
                      );
                    }}
                  >
                    <Trash2 size={14} /> {t("Remove cover")}{" "}
                  </button>
                )}
                {coverBusy && <p role="status">{t("Saving cover…")}</p>}
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
                      aria-label={t("Move {value0} up", {
                        value0: e.preferredTitle,
                      })}
                      disabled={i === 0}
                      onClick={() => reorder(i, i - 1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={t("Move {value0} down", {
                        value0: e.preferredTitle,
                      })}
                      disabled={i === list.entryIds.length - 1}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={t("Remove {value0} from list", {
                        value0: e.preferredTitle,
                      })}
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
              title={t("No anime in this list")}
              text={t(
                "Choose anime from your library, then arrange them your way.",
              )}
              action={t("Add titles")}
              onAction={() => setAdding(true)}
            />
          )}
          <button
            className="text-button delete-list"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} /> {t("Delete list")}{" "}
          </button>
        </>
      ) : (
        <>
          <PageTitle title={t("Lists")}>
            <button
              className="button primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} /> {t("Create a list")}{" "}
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
                      <span className="prose">{t("No cover")}</span>
                    )}
                  </div>
                  <span className="eyebrow">
                    {l.ranked ? t("RANKED") : t("COLLECTION")} ·{" "}
                    {l.entryIds.length} {t("TITLES")}{" "}
                  </span>
                  <h2>{l.title}</h2>
                  <p>{l.description || ""}</p>
                  <span className="list-privacy">
                    <Lock size={12} />
                    {t(l.privacy)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={t("No lists yet")}
              text={t(
                "Start a list for a theme, a feeling, or your all-time favorites.",
              )}
              action={t("Create your first list")}
              onAction={() => setCreating(true)}
            />
          )}
        </>
      )}
      {creating && (
        <Modal title={t("Create a list")} onClose={() => setCreating(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const l = newList(title.trim());
              void store
                .mutate((d) => ({ ...d, lists: [l, ...d.lists] }))
                .then((result) => {
                  if (!result.ok) return;
                  setCreating(false);
                  setSelected(l.id);
                  setTitle("");
                });
            }}
          >
            <label className="field">
              {" "}
              {t("List title")}{" "}
              <input
                autoFocus
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("Anime for quiet nights")}
              />
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={!title.trim()}>
                {" "}
                {t("Create list")}{" "}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {adding && list && (
        <Modal
          title={t("Choose from your library")}
          onClose={() => setAdding(false)}
          wide
        >
          <label className="field">
            {" "}
            {t("Find an anime")}{" "}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search your library")}
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
            {" "}
            {t("Done")}{" "}
          </button>
        </Modal>
      )}
      {confirmDelete && list && (
        <Modal
          title={t("Delete “{value0}”?", { value0: list.title })}
          onClose={() => setConfirmDelete(false)}
        >
          <p className="prose">
            {" "}
            {t(
              "Your anime stay in your library. If this list was published, its removal is queued automatically.",
            )}{" "}
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setConfirmDelete(false)}>
              {" "}
              {t("Keep list")}{" "}
            </button>
            <button
              className="button"
              onClick={() => {
                void store
                  .mutate((d) => ({
                    ...d,
                    lists: d.lists.filter((l) => l.id !== list.id),
                  }))
                  .then((result) => {
                    if (!result.ok) return;
                    setConfirmDelete(false);
                    setSelected(null);
                  });
              }}
            >
              {" "}
              {t("Delete local list")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {share && list && (
        <Modal
          title={t("Share this collection")}
          onClose={() => setShare(false)}
        >
          <p className="prose">
            {" "}
            {t(
              "Publish only what you choose. Private notes are always excluded.",
            )}{" "}
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={list.shareThoughts}
              onChange={(e) => void patch({ shareThoughts: e.target.checked })}
            />{" "}
            {t("Include quick thoughts in this shared list")}{" "}
          </label>
          <p className="muted">
            {" "}
            {t("Visibility:")} {t(list.privacy)}
            {t(
              ". First publication is explicit. Later changes to a published list queue automatically.",
            )}{" "}
          </p>
          {social.configured ? (
            <button className="button primary" onClick={() => void publish()}>
              {list.privacy === "Private"
                ? t("Remove online publication")
                : t("Publish update")}
            </button>
          ) : (
            <p className="configuration-note">
              {" "}
              {t(
                "Online sharing: Not configured. See Settings and SOCIAL_ARCHITECTURE.md.",
              )}{" "}
            </p>
          )}
          {link && (
            <div className="share-link">
              <input readOnly aria-label={t("Share link")} value={link} />
              <button
                className="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => store.notify("Link copied."))
                }
              >
                <Copy size={14} /> {t("Copy link")}{" "}
              </button>
              <a
                className="button"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> {t("Open public view")}{" "}
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
