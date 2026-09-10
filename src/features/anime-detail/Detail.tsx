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
}: {
  anime: Anime;
  onBack: () => void;
  quick?: boolean;
}) {
  const store = useApp();
  const entry = store.data.entries.find((e) => e.anilistId === anime.anilistId);
  const m = entry?.cachedMetadata ?? anime;
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thought, setThought] = useState(entry?.shortOpinion ?? "");
  const [review, setReview] = useState(entry?.review ?? "");
  const [notes, setNotes] = useState(entry?.privateNotes ?? "");
  const [spoiler, setSpoiler] = useState(
    entry?.reviewContainsSpoilers ?? false,
  );
  const [visibility, setVisibility] = useState(
    entry?.reviewPrivacy ?? "Private",
  );
  const title = entry?.preferredTitle ?? m.english ?? m.romaji;
  const refresh = async () => {
    setBusy(true);
    try {
      const [fresh] = await anilist.byIds([m.anilistId]);
      if (fresh && entry)
        await store.edit(entry.localId, {
          cachedMetadata: fresh,
          coverImage: fresh.coverImage,
          bannerImage: fresh.bannerImage,
          totalEpisodes:
            fresh.episodes === null
              ? entry.totalEpisodes
              : Math.max(entry.watchedEpisodes, fresh.episodes),
          lastMetadataRefresh: fresh.fetchedAt,
        });
      store.notify("Metadata refreshed.");
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
      {m.bannerImage && (
        <Artwork className="detail-banner" src={m.bannerImage} title="" eager />
      )}
      <div className="detail-body">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to collection
        </button>
        <div className="detail-heading">
          <div className="detail-cover">
            <Artwork
              src={entry?.coverImage ?? m.coverLarge}
              title={title}
              eager
            />
            {entry ? (
              <>
                <Progress entry={entry} />
                <button
                  className="button full"
                  onClick={() => void store.rewatch(entry.localId)}
                >
                  <RefreshCw size={14} />
                  Start a rewatch
                </button>
              </>
            ) : (
              <button
                className="button primary full"
                onClick={() => void store.add(m)}
              >
                <Plus size={16} />
                Add to Watchlist
              </button>
            )}
          </div>
          <div className="detail-info">
            <p className="eyebrow">
              {m.format?.replaceAll("_", " ") ?? "ANIME"}{" "}
              <span className="dot">·</span> {m.year ?? "TBA"}{" "}
              <span className="dot">·</span> {m.episodes ?? "?"} EPISODES
            </p>
            <h1>{title}</h1>
            <p className="native-title">{m.native ?? m.romaji}</p>
            <div className="detail-meta">
              <span>{m.studios.join(" / ") || "Studio unknown"}</span>
              <span>{m.genres.join(" · ")}</span>
            </div>
            <div className="detail-ratings">
              <div>
                <span className="eyebrow">YOU</span>
                <Stars
                  value={entry?.personalRating ?? null}
                  onChange={
                    entry
                      ? (v) =>
                          void store.edit(entry.localId, { personalRating: v })
                      : undefined
                  }
                />
              </div>
              <div className="community">
                <span className="eyebrow">ANILIST COMMUNITY</span>
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
                    aria-label="Like anime"
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
                    aria-label="Favorite anime"
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
                  aria-label="Personal status"
                  value={entry.personalStatus}
                  onChange={(e) =>
                    void store.edit(entry.localId, {
                      personalStatus: e.target
                        .value as typeof entry.personalStatus,
                    })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button className="button" onClick={editReview}>
                  <Edit3 size={14} />
                  Write a thought
                </button>
                <button
                  className="icon-button"
                  aria-label="Refresh metadata"
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
                Next: episode {m.nextAiringEpisode.episode} ·{" "}
                {new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="detail-editorial">
          <section>
            <p className="eyebrow">
              {m.source === "Sample"
                ? "SAMPLE DESCRIPTION · JIKAN / MAL"
                : "DESCRIPTION · ANILIST"}
            </p>
            <p className="prose description">
              {m.description || "A synopsis is not available yet."}
            </p>
            <dl className="metadata-list">
              <dt>Release</dt>
              <dd>
                {m.startDate ?? "Unknown"} — {m.endDate ?? "Ongoing / unknown"}
              </dd>
              <dt>Season</dt>
              <dd>
                {m.season ?? "Unknown"} {m.year}
              </dd>
              <dt>Duration</dt>
              <dd>{m.duration ? `${m.duration} minutes` : "Unknown"}</dd>
              <dt>Status</dt>
              <dd>{m.status?.replaceAll("_", " ") ?? "Unknown"}</dd>
              <dt>Country</dt>
              <dd>{m.country ?? "Unknown"}</dd>
            </dl>
          </section>
          <section>
            <div className="section-heading">
              <p className="eyebrow">REVIEW</p>
              {entry?.review && <ShareReview entry={entry} />}
              {entry && (
                <button className="text-button" onClick={editReview}>
                  <Edit3 size={13} />
                  Edit
                </button>
              )}
            </div>
            {entry?.review ? (
              entry.reviewContainsSpoilers && !reveal ? (
                <button
                  className="spoiler-button"
                  onClick={() => setReveal(true)}
                >
                  <Eye size={16} />
                  This review contains spoilers. Reveal review.
                </button>
              ) : (
                <p className="prose review">{entry.review}</p>
              )
            ) : (
              <p className="prose muted">No review yet.</p>
            )}
            {entry && (
              <>
                <div className="personal-dates">
                  <label>
                    Started
                    <input
                      aria-label="Started date"
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
                    Watched
                    <input
                      aria-label="Watched date"
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
                    Completed
                    <input
                      aria-label="Completed date"
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
                  Personal tags
                  <input
                    aria-label="Personal tags"
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
                    placeholder="e.g. late nights, unforgettable"
                  />
                </label>
                <label className="field">
                  Priority
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
                  {entry.rewatchCount} rewatches · Added{" "}
                  {new Date(entry.addedDate).toLocaleDateString()}
                </p>
                {entry.privateNotes && (
                  <details>
                    <summary>Private notes</summary>
                    <p className="prose">{entry.privateNotes}</p>
                  </details>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      {editing && entry && (
        <Modal title="Your words" onClose={() => setEditing(false)} wide>
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
                .then(() => {
                  if (!useApp.getState().error) setEditing(false);
                });
            }}
          >
            <label className="field">
              Quick thought <small>{thought.length} / 500</small>
              <textarea
                autoFocus
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Quick thought"
              />
            </label>
            <label className="field">
              Full review
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={100000}
                rows={7}
                placeholder="Make room for a longer thought."
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(e) => setSpoiler(e.target.checked)}
              />
              Contains spoilers
            </label>
            <SelectField
              label="Review visibility"
              empty="Choose visibility"
              options={[...privacyValues]}
              value={visibility}
              onChange={(v) => {
                if (v) setVisibility(v as typeof visibility);
              }}
            />
            <label className="field">
              Private notes <small>Always local</small>
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
                Cancel
              </button>
              <button type="submit" className="button primary">
                <Check size={15} />
                Save your words
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
