import { t, useLanguage, resolveLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
import { animeCover } from "../../domain/artwork";
import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  Star,
  RefreshCw,
  Check,
  Plus,
  Eye,
  Edit3,
} from "lucide-react";
import {
  Artwork,
  Progress,
  Stars,
  Modal,
  SelectField,
} from "../../components/ui";
import { type Anime, statuses, privacyValues } from "../../domain/model";
import { useApp } from "../../app/store";
import { anilist } from "../../services/anilist/provider";
import { ShareReview } from "./ShareReview";
export default function Detail({
  anime,
  onBack,
  quick = false,
  backLabel = "Back to collection",
}: {
  anime: Anime;
  onBack: () => void;
  quick?: boolean;
  backLabel?: string;
}) {
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
  const entry = store.data.entries.find((e) => e.anilistId === anime.anilistId);
  const m = entry?.cachedMetadata ?? anime;
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRewatch, setConfirmRewatch] = useState(false);
  const [thought, setThought] = useState(entry?.shortOpinion ?? "");
  const [review, setReview] = useState(entry?.review ?? "");
  const [notes, setNotes] = useState(entry?.privateNotes ?? "");
  const [spoiler, setSpoiler] = useState(
    entry?.reviewContainsSpoilers ?? false,
  );
  const [visibility, setVisibility] = useState(
    entry?.reviewPrivacy ?? "Private",
  );
  const banner = entry?.bannerImage || m.bannerImage;
  const cover = animeCover(m, entry?.coverImage);
  const title = entry?.preferredTitle ?? m.english ?? m.romaji;
  const refresh = async () => {
    setBusy(true);
    try {
      const [fresh] = await anilist.byIds([m.anilistId]);
      if (fresh && entry) {
        const result = await store.edit(entry.localId, {
          cachedMetadata: fresh,
          coverImage: fresh.coverImage,
          bannerImage: fresh.bannerImage,
          totalEpisodes:
            fresh.episodes === null
              ? entry.totalEpisodes
              : Math.max(entry.watchedEpisodes, fresh.episodes),
          lastMetadataRefresh: fresh.fetchedAt,
        });
        if (result.ok) store.notify("Metadata refreshed.");
      }
    } catch (e) {
      store.notify(String(e));
    } finally {
      setBusy(false);
    }
  };
  const editReview = () => {
    setThought(entry?.shortOpinion ?? "");
    setReview(entry?.review ?? "");
    setNotes(entry?.privateNotes ?? "");
    setSpoiler(entry?.reviewContainsSpoilers ?? false);
    setVisibility(entry?.reviewPrivacy ?? "Private");
    setEditing(true);
  };
  return (
    <div className={`detail-page ${quick ? "quick-detail" : ""}`}>
      <div className="detail-body">
        <div
          className={`detail-hero ${banner ? "has-banner" : "poster-backdrop"}`}
        >
          <Artwork
            className="detail-banner"
            src={banner || cover}
            title=""
            eager
          />
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={16} />
            {backLabel}
          </button>
          <div className="detail-heading">
            <div className="detail-cover" data-detail-cover>
              <Artwork
                src={cover}
                fallbackSrc={entry?.coverImage || m.coverImage}
                title={title}
                eager
              />
              {entry ? (
                <>
                  <Progress entry={entry} />
                  {entry.personalStatus === "Completed" && (
                    <button
                      className="button full"
                      onClick={() => setConfirmRewatch(true)}
                    >
                      <RefreshCw size={14} />
                      {t("Start a rewatch")}
                    </button>
                  )}
                  {["Planning", "Paused", "Dropped"].includes(
                    entry.personalStatus,
                  ) && (
                    <button
                      className="button primary full"
                      onClick={() =>
                        void store.edit(entry.localId, {
                          personalStatus: "Watching",
                        })
                      }
                    >
                      {entry.personalStatus === "Planning"
                        ? t("Start watching")
                        : t("Continue watching")}
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="button primary full"
                  onClick={() => void store.add(m)}
                >
                  <Plus size={16} /> {t("Add to Watchlist")}{" "}
                </button>
              )}
            </div>
            <div className="detail-info">
              <p className="eyebrow">
                {m.format?.replaceAll("_", " ") ?? "ANIME"}{" "}
                <span className="dot">·</span> {m.year ?? "TBA"}{" "}
                <span className="dot">·</span> {m.episodes ?? "?"}{" "}
                {t("EPISODES")}{" "}
              </p>
              <h1>{title}</h1>
              <p className="native-title">{m.native ?? m.romaji}</p>
              <div className="detail-meta">
                <span>{m.studios.join(" / ") || "Studio unknown"}</span>
                <span>{m.genres.map((g) => t(g)).join(" · ")}</span>
              </div>
              <div className="detail-ratings">
                <div>
                  <span className="eyebrow">{t("YOU")}</span>
                  <Stars
                    value={entry?.personalRating ?? null}
                    onChange={
                      entry
                        ? (v) =>
                            void store.edit(entry.localId, {
                              personalRating: v,
                            })
                        : undefined
                    }
                  />
                </div>
                <div className="community">
                  <span className="eyebrow">{t("ANILIST COMMUNITY")}</span>
                  <strong>
                    {m.averageScore ?? "—"}
                    <small>/ 100</small>
                  </strong>
                </div>
                {entry && (
                  <>
                    <button
                      className={`icon-button love ${entry.liked ? "selected" : ""}`}
                      aria-pressed={entry.liked}
                      aria-label={t("Like anime")}
                      onClick={() =>
                        void store.edit(entry.localId, { liked: !entry.liked })
                      }
                    >
                      <Heart
                        fill={entry.liked ? "currentColor" : "none"}
                        size={20}
                      />
                    </button>
                    <button
                      className={`icon-button ${entry.favorite ? "selected" : ""}`}
                      aria-pressed={entry.favorite}
                      aria-label={t("Favorite anime")}
                      onClick={() =>
                        void store.edit(entry.localId, {
                          favorite: !entry.favorite,
                        })
                      }
                    >
                      <Star
                        fill={entry.favorite ? "currentColor" : "none"}
                        size={20}
                      />
                    </button>
                  </>
                )}
              </div>
              {entry && (
                <div className="detail-actions">
                  <select
                    aria-label={t("Personal status")}
                    value={entry.personalStatus}
                    onChange={(e) =>
                      void store.edit(entry.localId, {
                        personalStatus: e.target
                          .value as typeof entry.personalStatus,
                      })
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                  <button className="button" onClick={editReview}>
                    <Edit3 size={14} /> {t("Write a thought")}{" "}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={t("Refresh metadata")}
                    disabled={busy || !navigator.onLine}
                    onClick={() => void refresh()}
                  >
                    <RefreshCw size={15} className={busy ? "spin" : ""} />
                  </button>
                </div>
              )}
              {entry?.shortOpinion && (
                <blockquote className="detail-thought">
                  “{entry.shortOpinion}”
                </blockquote>
              )}
              {m.nextAiringEpisode && (
                <p className="next-airing">
                  {" "}
                  {t("Next: episode")} {m.nextAiringEpisode.episode} ·{" "}
                  {new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleString(
                    resolveLanguage(
                      useApp.getState().data.preferences.language,
                    ),
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="detail-editorial">
          <section>
            <p className="eyebrow">
              {m.source === "Sample"
                ? t("SAMPLE DESCRIPTION · JIKAN / MAL")
                : t("DESCRIPTION · ANILIST")}
            </p>
            <p className="prose description">
              {m.description || "A synopsis is not available yet."}
            </p>
            <dl className="metadata-list">
              <dt>{t("Release")}</dt>
              <dd>
                {m.startDate ?? "Unknown"} — {m.endDate ?? "Ongoing / unknown"}
              </dd>
              <dt>{t("Season")}</dt>
              <dd>
                {m.season ?? "Unknown"} {m.year}
              </dd>
              <dt>{t("Duration")}</dt>
              <dd>{m.duration ? `${m.duration} minutes` : t("Unknown")}</dd>
              <dt>{t("Status")}</dt>
              <dd>{m.status?.replaceAll("_", " ") ?? "Unknown"}</dd>
              <dt>{t("Country")}</dt>
              <dd>{m.country ?? "Unknown"}</dd>
            </dl>
          </section>
          <section>
            <div className="section-heading">
              <p className="eyebrow">{t("REVIEW")}</p>
              {entry?.review && <ShareReview entry={entry} />}
              {entry && (
                <button className="text-button" onClick={editReview}>
                  <Edit3 size={13} /> {t("Edit")}{" "}
                </button>
              )}
            </div>
            {entry?.review ? (
              entry.reviewContainsSpoilers && !reveal ? (
                <button
                  className="spoiler-button"
                  onClick={() => setReveal(true)}
                >
                  <Eye size={16} />{" "}
                  {t("This review contains spoilers. Reveal review.")}{" "}
                </button>
              ) : (
                <p className="prose review">{entry.review}</p>
              )
            ) : (
              <p className="prose muted">{t("No review yet.")}</p>
            )}
            {entry && (
              <>
                <div className="personal-dates">
                  <label>
                    {" "}
                    {t("Started")}{" "}
                    <input
                      aria-label={t("Started date")}
                      type="date"
                      value={entry.startedDate?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        void store.edit(entry.localId, {
                          startedDate: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    {" "}
                    {t("Watched")}{" "}
                    <input
                      aria-label={t("Watched date")}
                      type="date"
                      value={entry.watchedDate?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        void store.edit(entry.localId, {
                          watchedDate: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    {" "}
                    {t("Completed")}{" "}
                    <input
                      aria-label={t("Completed date")}
                      type="date"
                      value={entry.completedDate?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        void store.edit(entry.localId, {
                          completedDate: e.target.value || null,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  {" "}
                  {t("Personal tags")}{" "}
                  <input
                    aria-label={t("Personal tags")}
                    defaultValue={entry.personalTags.join(", ")}
                    onBlur={(e) =>
                      void store.edit(entry.localId, {
                        personalTags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .slice(0, 50),
                      })
                    }
                    placeholder={t("e.g. late nights, unforgettable")}
                  />
                </label>
                <label className="field">
                  {" "}
                  {t("Priority")}{" "}
                  <select
                    value={entry.priority}
                    onChange={(e) =>
                      void store.edit(entry.localId, {
                        priority: Number(e.target.value),
                      })
                    }
                  >
                    {["None", "Low", "Medium", "High"].map((v, i) => (
                      <option value={i} key={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  {entry.rewatchCount} {t("rewatches · Added")}{" "}
                  {new Date(entry.addedDate).toLocaleDateString(
                    resolveLanguage(
                      useApp.getState().data.preferences.language,
                    ),
                  )}
                </p>
                {entry.privateNotes && (
                  <details>
                    <summary>{t("Private notes")}</summary>
                    <p className="prose">{entry.privateNotes}</p>
                  </details>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      {confirmRewatch && entry && (
        <Modal
          title={t("Start a rewatch?")}
          onClose={() => setConfirmRewatch(false)}
        >
          <p>
            {t(
              "This resets episode progress to zero and starts a new viewing. Your reviews and ratings are kept.",
            )}
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setConfirmRewatch(false)}>
              {t("Cancel")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await store.rewatch(entry.localId);
                if (result.ok) setConfirmRewatch(false);
                setBusy(false);
              }}
            >
              {t("Start a rewatch")}
            </button>
          </div>
        </Modal>
      )}
      {editing && entry && (
        <Modal title={t("Your words")} onClose={() => setEditing(false)} wide>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void store
                .edit(entry.localId, {
                  shortOpinion: thought,
                  review,
                  privateNotes: notes,
                  reviewContainsSpoilers: spoiler,
                  reviewPrivacy: visibility,
                })
                .then((result) => {
                  if (result.ok) setEditing(false);
                });
            }}
          >
            <label className="field">
              {" "}
              {t("Quick thought")} <small>{thought.length} / 500</small>
              <textarea
                autoFocus
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t("Quick thought")}
              />
            </label>
            <label className="field">
              {" "}
              {t("Full review")}{" "}
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={100000}
                rows={7}
                placeholder={t("Make room for a longer thought.")}
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(e) => setSpoiler(e.target.checked)}
              />{" "}
              {t("Contains spoilers")}{" "}
            </label>
            <SelectField
              label={t("Review visibility")}
              empty={t("Choose visibility")}
              options={[...privacyValues]}
              value={visibility}
              onChange={(v) => {
                if (v) setVisibility(v as typeof visibility);
              }}
            />
            <label className="field">
              {" "}
              {t("Private notes")} <small>{t("Always local")}</small>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={100000}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => setEditing(false)}
              >
                {" "}
                {t("Cancel")}{" "}
              </button>
              <button type="submit" className="button primary">
                <Check size={15} /> {t("Save your words")}{" "}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
