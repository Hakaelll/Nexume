import { t, useLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
import { AvatarEditor } from "./AvatarEditor";
import {
  loadAvatar,
  cropAvatar,
  centeredCrop,
  type AvatarCrop,
} from "./avatar";
import { useState } from "react";
import { Edit3, Plus, Check, Share2, ArrowUpRight } from "lucide-react";
import { useApp } from "../../app/store";
import { type Entry, type LocalUser, privacyValues } from "../../domain/model";
import { AnimeCard, Artwork, Empty, Modal, Stars } from "../../components/ui";
import { social, publicLink } from "../../services/social/provider";
import { serializeProfile } from "../../services/social/serialization";
import { enqueue, flushQueue } from "../../services/social/sync";
export default function Profile({ onOpen }: { onOpen: (e: Entry) => void }) {
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
  const { profile, entries } = store.data;
  const [avatarSource, setAvatarSource] = useState<HTMLImageElement | null>(
    null,
  );
  const [crop, setCrop] = useState(centeredCrop);
  const [favoriteQuery, setFavoriteQuery] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [editing, setEditing] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");
  const [revealed, setRevealed] = useState<string[]>([]);
  const visibleFavorites = entries.filter((e) =>
    [e.preferredTitle, e.cachedMetadata.english, e.cachedMetadata.romaji].some(
      (t) => t?.toLowerCase().includes(favoriteQuery.trim().toLowerCase()),
    ),
  );
  const adjustCrop = (patch: Partial<AvatarCrop>) => {
    const next = { ...crop, ...patch };
    setCrop(next);
    if (avatarSource)
      setDraft((d) => ({ ...d, avatar: cropAvatar(avatarSource, next) }));
  };
  const picked = profile.favoriteIds.flatMap(
    (id) => entries.find((e) => e.localId === id) ?? [],
  );
  const rated = [...entries]
    .filter((e) => e.personalRating)
    .sort((a, b) => b.personalRating! - a.personalRating!)
    .slice(0, 6);
  const recent = [...entries]
    .filter((e) => e.lastWatchedDate)
    .sort((a, b) => b.lastWatchedDate!.localeCompare(a.lastWatchedDate!))
    .slice(0, 6);
  const reviews = entries.filter((e) => e.review);
  const publish = async () => {
    try {
      await enqueue(
        profile.publicId,
        "profile",
        profile.privacy,
        profile.privacy === "Private" ? {} : serializeProfile(store.data),
      );
      await flushQueue(true);
      if (profile.privacy !== "Private") setLink(publicLink(profile.publicId));
      store.notify(
        useApp
          .getState()
          .data.queue.some((j) => j.publicId === profile.publicId)
          ? "Pending sync."
          : "Publication updated.",
      );
    } catch (e) {
      store.notify(String(e));
    }
  };
  return (
    <div className="page profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <Artwork src={profile.avatar} title={profile.displayName} />
          ) : (
            <img src="/brand/logo.png" alt="Nexume emblem" />
          )}
        </div>

        <h1>{profile.displayName}</h1>
        <span className="username">@{profile.username}</span>
        <p className="prose profile-bio">{profile.bio}</p>
        <p className="profile-counts">
          {entries.length} {t("anime")} <span>·</span> {reviews.length}{" "}
          {t("reviews")} <span>·</span> {store.data.lists.length}{" "}
          {t("lists")}{" "}
        </p>
        <div className="profile-actions">
          <button
            className="button"
            onClick={() => {
              setDraft(profile);
              setAvatarSource(null);
              setAvatarError("");
              setEditing(true);
            }}
          >
            <Edit3 size={14} /> {t("Edit profile")}{" "}
          </button>
          <button className="button" onClick={() => setSharing(true)}>
            <Share2 size={14} /> {t("Share profile")}{" "}
          </button>
        </div>
      </header>
      <section className="home-section">
        <div className="section-heading">
          <h2>{t("Favorites")}</h2>
          <button
            className="text-button"
            onClick={() => {
              setFavoriteQuery("");
              setFavorites(true);
            }}
          >
            {" "}
            {t("Choose favorites")} <Plus size={14} />
          </button>
        </div>
        <div className="profile-favorites">
          {picked.map((e) => (
            <AnimeCard key={e.localId} entry={e} onOpen={() => onOpen(e)} />
          ))}
          {Array.from({ length: picked.length < 6 ? 1 : 0 }, (_, i) => (
            <button
              className="favorite-slot"
              key={i}
              onClick={() => {
                setFavoriteQuery("");
                setFavorites(true);
              }}
              aria-label={t("Choose profile favorite {value0}", {
                value0: picked.length + i + 1,
              })}
            >
              <Plus size={20} />
              <span>{String(picked.length + i + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </section>
      {recent.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>{t("Recently watched")}</h2>
          </div>
          <div className="poster-grid">
            {recent.map((e) => (
              <AnimeCard key={e.localId} entry={e} onOpen={() => onOpen(e)} />
            ))}
          </div>
        </section>
      )}
      {rated.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>{t("Held in high regard.")}</h2>
          </div>
          <div className="poster-grid">
            {rated.map((e) => (
              <AnimeCard key={e.localId} entry={e} onOpen={() => onOpen(e)} />
            ))}
          </div>
        </section>
      )}
      <section className="home-section">
        <div className="section-heading">
          <h2>{t("Curated lists")}</h2>
          <button
            className="text-button"
            onClick={() => void store.prefs({ section: "Lists" })}
          >
            {" "}
            {t("All lists")} <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="profile-lists">
          {store.data.lists.map((l) => (
            <button
              key={l.id}
              onClick={() => void store.prefs({ section: "Lists" })}
            >
              <span>{l.title}</span>
              <small>
                {l.entryIds.length} {t("titles ·")} {l.privacy}
              </small>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <h2>{t("In your words.")}</h2>
        </div>
        {reviews.length ? (
          reviews.map((e) => (
            <article className="profile-review" key={e.localId}>
              <div>
                <button className="text-button" onClick={() => onOpen(e)}>
                  {e.preferredTitle}
                  <ArrowUpRight size={14} />
                </button>
                <Stars value={e.personalRating} />
              </div>
              {e.reviewContainsSpoilers && !revealed.includes(e.localId) ? (
                <button
                  className="text-button"
                  onClick={() => setRevealed((ids) => [...ids, e.localId])}
                >
                  {" "}
                  {t("Reveal spoiler review")}{" "}
                </button>
              ) : (
                <p className="prose">
                  {e.review.length > 600
                    ? `${e.review.slice(0, 600)}…`
                    : e.review}
                </p>
              )}
              <small className="muted">{e.reviewPrivacy}</small>
            </article>
          ))
        ) : (
          <p className="prose muted">{t("No reviews yet.")}</p>
        )}
      </section>
      {editing && (
        <Modal
          title={t("Your local profile")}
          onClose={() => setEditing(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void store
                .mutate((d) => ({ ...d, profile: draft }))
                .then((result) => {
                  if (result.ok) setEditing(false);
                });
            }}
          >
            <label className="field">
              {" "}
              {t("Display name")}{" "}
              <input
                required
                maxLength={100}
                value={draft.displayName}
                onChange={(e) =>
                  setDraft({ ...draft, displayName: e.target.value })
                }
              />
            </label>
            <label className="field">
              {" "}
              {t("Username")}{" "}
              <input
                required
                pattern="[a-zA-Z0-9_-]{1,40}"
                maxLength={40}
                value={draft.username}
                onChange={(e) =>
                  setDraft({ ...draft, username: e.target.value })
                }
              />
            </label>
            <label className="field">
              {" "}
              {t("Bio")}{" "}
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              />
            </label>
            <div className="avatar-upload">
              {draft.avatar && !avatarSource && (
                <Artwork
                  src={draft.avatar}
                  title={t("Profile photo preview")}
                  eager
                />
              )}
              <label className="field">
                {" "}
                {t("Upload profile photo")}{" "}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarBusy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setAvatarBusy(true);
                    setAvatarError("");
                    try {
                      const image = await loadAvatar(file);
                      setAvatarSource(image);
                      setCrop(centeredCrop);
                      const avatar = cropAvatar(image, centeredCrop);
                      setDraft((current) => ({ ...current, avatar }));
                    } catch (error) {
                      setAvatarError(
                        error instanceof Error
                          ? error.message
                          : "Could not read this image.",
                      );
                    } finally {
                      setAvatarBusy(false);
                    }
                  }}
                />
              </label>
              {draft.avatar && (
                <button
                  type="button"
                  className="text-button"
                  disabled={avatarBusy}
                  onClick={() => {
                    setDraft({ ...draft, avatar: "" });
                    setAvatarSource(null);
                  }}
                >
                  {" "}
                  {t("Remove photo")}{" "}
                </button>
              )}
            </div>
            {avatarSource && (
              <AvatarEditor
                image={avatarSource}
                crop={crop}
                onChange={adjustCrop}
              />
            )}
            {avatarError && <p role="alert">{avatarError}</p>}
            <label className="field">
              {" "}
              {t("Avatar URL")}{" "}
              <input
                type="url"
                placeholder={t("https://…")}
                value={draft.avatar.startsWith("data:") ? "" : draft.avatar}
                onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
              />
            </label>
            <label className="field">
              {" "}
              {t("Profile visibility")}{" "}
              <select
                value={draft.privacy}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    privacy: e.target.value as LocalUser["privacy"],
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
            <div className="form-actions">
              <button className="button primary" disabled={avatarBusy}>
                {" "}
                {t("Save profile")}{" "}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {favorites && (
        <Modal
          title={t("Choose favorites · {value0}/6", { value0: picked.length })}
          onClose={() => setFavorites(false)}
          wide
        >
          <label className="field favorite-search">
            {" "}
            {t("Find an anime")}{" "}
            <input
              type="search"
              autoFocus
              value={favoriteQuery}
              onChange={(e) => setFavoriteQuery(e.target.value)}
              placeholder={t("Search your library")}
            />
          </label>
          {entries.length > 0 && !visibleFavorites.length && (
            <p className="prose">{t("No matching anime.")}</p>
          )}
          {entries.length ? (
            <div className="picker-list">
              {visibleFavorites.map((e) => {
                const checked = profile.favoriteIds.includes(e.localId);
                return (
                  <button
                    aria-label={e.preferredTitle}
                    aria-pressed={checked}
                    disabled={!checked && picked.length >= 6}
                    key={e.localId}
                    onClick={() =>
                      void store.mutate((d) => ({
                        ...d,
                        profile: {
                          ...d.profile,
                          favoriteIds: checked
                            ? d.profile.favoriteIds.filter(
                                (i) => i !== e.localId,
                              )
                            : [...d.profile.favoriteIds, e.localId],
                        },
                      }))
                    }
                  >
                    <Artwork src={e.coverImage} title={e.preferredTitle} />
                    <span>{e.preferredTitle}</span>
                    {checked ? <Check size={17} /> : <Plus size={17} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              title={t("Start with your library.")}
              text={t("Add anime before choosing your six favorites.")}
            />
          )}
          <button className="button full" onClick={() => setFavorites(false)}>
            {" "}
            {t("Done")}{" "}
          </button>
        </Modal>
      )}
      {sharing && (
        <Modal title={t("Share profile")} onClose={() => setSharing(false)}>
          <p className="prose">
            {" "}
            {t(
              "Your shared profile includes your bio, six chosen favorites and public list links. Your private notes and viewing diary stay here.",
            )}{" "}
          </p>
          <p>
            {t("Visibility:")} {profile.privacy}
          </p>
          {social.configured ? (
            <button className="button primary" onClick={() => void publish()}>
              {profile.privacy === "Private"
                ? t("Remove online publication")
                : t("Publish profile")}
            </button>
          ) : (
            <p className="configuration-note">
              {" "}
              {t(
                "Online sharing: Not configured. Configure your optional Supabase project to publish.",
              )}{" "}
            </p>
          )}
          {link && (
            <div className="share-link">
              <input
                readOnly
                aria-label={t("Profile share link")}
                value={link}
              />
              <button
                className="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => store.notify("Link copied."))
                }
              >
                {" "}
                {t("Copy link")}{" "}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="button"
              >
                {" "}
                {t("Open public view")}{" "}
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
