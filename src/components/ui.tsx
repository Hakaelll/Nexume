import { animeCover } from "../domain/artwork";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Heart,
  Minus,
  Plus,
  X,
  Check,
  Bookmark,
  Star,
  Eye,
} from "lucide-react";
import { cachedImage } from "../core/platform";
import { type Entry, type Anime } from "../domain/model";
import { useApp } from "../app/store";
import { Artwork as DisplayArtwork, Stars } from "./display";
export { Stars } from "./display";
export function Artwork(props: React.ComponentProps<typeof DisplayArtwork>) {
  return <DisplayArtwork {...props} resolveImage={cachedImage} />;
}
export function Progress({
  entry,
  compact = false,
}: {
  entry: Entry;
  compact?: boolean;
}) {
  const store = useApp.getState();
  const [draft, setDraft] = useState(String(entry.watchedEpisodes));
  useEffect(
    () => setDraft(String(entry.watchedEpisodes)),
    [entry.watchedEpisodes],
  );
  const update = () => {
    const n = Number(draft);
    if (Number.isInteger(n) && n >= 0) void store.episodes(entry.localId, n);
    else setDraft(String(entry.watchedEpisodes));
  };
  const full =
    entry.totalEpisodes !== null &&
    entry.watchedEpisodes === entry.totalEpisodes &&
    entry.personalStatus !== "Completed";
  return (
    <div className={`episode-control ${compact ? "compact" : ""}`}>
      <div className="episode-line">
        <span className="eyebrow">
          EPISODE {entry.watchedEpisodes}{" "}
          <span className="muted">/ {entry.totalEpisodes ?? "?"}</span>
        </span>
        <div className="stepper">
          <button
            className="icon-button"
            aria-label={`Remove one episode from ${entry.preferredTitle}`}
            disabled={entry.watchedEpisodes === 0}
            onClick={() => void store.adjustEpisodes(entry.localId, -1)}
          >
            <Minus size={14} />
          </button>
          {!compact && (
            <input
              aria-label="Watched episodes"
              inputMode="numeric"
              type="number"
              min="0"
              max={entry.totalEpisodes ?? 100000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={update}
              onKeyDown={(e) => {
                if (e.key === "Enter") update();
              }}
            />
          )}
          <button
            className="icon-button plus"
            aria-label={`Add one episode to ${entry.preferredTitle}`}
            disabled={
              entry.totalEpisodes !== null &&
              entry.watchedEpisodes >= entry.totalEpisodes
            }
            onClick={() => void store.adjustEpisodes(entry.localId, 1)}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="progress-track">
        <div
          style={{
            width: `${entry.totalEpisodes ? (entry.watchedEpisodes / entry.totalEpisodes) * 100 : 0}%`,
          }}
        />
      </div>
      {full && (
        <button
          className="inline-complete"
          onClick={() => {
            void store.complete(entry.localId);
            store.notify(
              "Completed. Add a rating or a thought whenever you like.",
            );
          }}
        >
          <Check size={13} /> Mark as completed?
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          autoFocus
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({
  title = "Your collection is empty.",
  text = "Start with something you've watched.",
  action,
  onAction,
}: {
  title?: string;
  text?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="button primary" onClick={onAction}>
          {action}
          <ArrowUpRight size={16} />
        </button>
      )}
    </div>
  );
}
export function PageTitle({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
const entryIndexes = new WeakMap<Entry[], Map<number, Entry>>();
function indexEntries(entries: Entry[]) {
  let index = entryIndexes.get(entries);
  if (!index) {
    index = new Map(entries.map((entry) => [entry.anilistId, entry]));
    entryIndexes.set(entries, index);
  }
  return index;
}
export function AnimeCard({
  entry: suppliedEntry,
  anime,
  onOpen,
  onContext,
  tracking = false,
}: {
  entry?: Entry;
  anime?: Anime;
  onOpen: () => void;
  onContext?: (e: React.MouseEvent) => void;
  tracking?: boolean;
}) {
  const store = useApp.getState();
  const entry =
    useApp((state) =>
      indexEntries(state.data.entries).get(
        suppliedEntry?.anilistId ?? anime!.anilistId,
      ),
    ) ?? suppliedEntry;
  const [ratingOpen, setRatingOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 2000);
    return () => clearTimeout(timer);
  }, [feedback]);
  const m = entry?.cachedMetadata ?? anime!;
  const title = entry?.preferredTitle ?? m.english ?? m.romaji;
  const act = async (patch?: Partial<Entry>) => {
    setBusy(true);
    try {
      if (!entry) await store.add(m);
      if (useApp.getState().error) return;
      const saved = useApp
        .getState()
        .data.entries.find((e) => e.anilistId === m.anilistId);
      if (saved && patch) await store.edit(saved.localId, patch);
      if (!useApp.getState().error)
        setFeedback(
          patch?.personalStatus === "Completed"
            ? "Completed"
            : patch?.liked !== undefined
              ? "like"
              : !patch
                ? "bookmark"
                : "",
        );
    } finally {
      setBusy(false);
    }
  };
  return (
    <article
      className={`anime-card ${tracking ? "tracking" : ""}`}
      data-anime-id={m.anilistId}
      data-feedback={feedback}
      onAnimationEnd={() => setFeedback("")}
      onContextMenu={onContext}
    >
      <button
        className="cover-button"
        onClick={onOpen}
        aria-label={`Open ${title}`}
      >
        <Artwork
          src={animeCover(m, entry?.coverImage)}
          fallbackSrc={entry?.coverImage || m.coverImage}
          title={title}
        />
        <span className="cover-open">
          <ArrowUpRight size={18} />
        </span>
        {entry?.liked && (
          <span className="cover-like">
            <Heart size={15} fill="currentColor" />
          </span>
        )}
        {entry && <span className="cover-status">{entry.personalStatus}</span>}
      </button>
      <div className="card-actions" aria-label={`Quick actions for ${title}`}>
        <button
          className="icon-button"
          disabled={busy || !!entry}
          aria-label={
            entry ? `${title} is in your library` : `Add ${title} to Watchlist`
          }
          title={entry ? "In your library" : "Add to Watchlist"}
          onClick={() => void act()}
        >
          <Bookmark size={15} fill={entry ? "currentColor" : "none"} />
        </button>
        <button
          className="icon-button"
          disabled={busy}
          aria-label={`Like ${title}`}
          aria-pressed={entry?.liked ?? false}
          title="Like"
          onClick={() => void act({ liked: !entry?.liked })}
        >
          <Heart size={15} fill={entry?.liked ? "currentColor" : "none"} />
        </button>
        <button
          className="icon-button"
          aria-label={`Rate ${title}`}
          title="Rate"
          onClick={() => setRatingOpen(true)}
        >
          <Star
            size={15}
            fill={entry?.personalRating ? "currentColor" : "none"}
          />
        </button>
        <button
          className="icon-button"
          disabled={busy || entry?.personalStatus === "Completed"}
          aria-label={`Mark ${title} as watched`}
          title="Mark as watched"
          onClick={() => void act({ personalStatus: "Completed" })}
        >
          <Eye size={15} />
        </button>
      </div>
      {feedback === "Completed" && (
        <span className="card-confirmation" role="status">
          <Check size={14} /> Completed
        </span>
      )}
      {ratingOpen && (
        <Modal title={`Rate ${title}`} onClose={() => setRatingOpen(false)}>
          <p className="muted">Your rating · saved to your collection</p>
          <fieldset className="quick-rating" disabled={busy}>
            <Stars
              value={entry?.personalRating ?? null}
              onChange={(value) => void act({ personalRating: value })}
            />
          </fieldset>
        </Modal>
      )}
      {entry && !tracking && (
        <div className="grid-quick-actions">
          <button
            className="icon-button"
            aria-label={`Add one episode to ${title}`}
            disabled={
              entry.totalEpisodes !== null &&
              entry.watchedEpisodes >= entry.totalEpisodes
            }
            onClick={() =>
              void useApp.getState().adjustEpisodes(entry.localId, 1)
            }
          >
            <Plus size={15} />
          </button>
        </div>
      )}
      <div className="card-title">
        <button onClick={onOpen}>{title}</button>
        <span>{m.year ?? "TBA"}</span>
      </div>
      {entry ? (
        tracking ? (
          <Progress entry={entry} compact />
        ) : (
          <div className="card-meta">
            <Stars
              value={entry.personalRating}
              onChange={(value) =>
                void useApp
                  .getState()
                  .edit(entry.localId, { personalRating: value })
              }
            />
            <span>
              {entry.watchedEpisodes}/{entry.totalEpisodes ?? "?"} ep
            </span>
          </div>
        )
      ) : (
        <div className="card-meta">
          <span>
            {m.format?.replaceAll("_", " ") ?? "Anime"} · {m.episodes ?? "?"}{" "}
            episodes
          </span>
          <span>
            {m.averageScore ?? "—"} <small>AL</small>
          </span>
        </div>
      )}
    </article>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
  empty = "All",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  empty?: string;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SampleCovers() {
  return (
    <div className="sample-covers" aria-label="Sample anime artwork">
      {[
        [1, "Cowboy Bebop"],
        [30, "Neon Genesis Evangelion"],
        [19, "Monster"],
        [154587, "Frieren"],
        [9253, "Steins;Gate"],
      ].map(([id, title]) => (
        <img key={id} src={`/demo/${id}-cover.jpg`} alt={String(title)} />
      ))}
    </div>
  );
}
