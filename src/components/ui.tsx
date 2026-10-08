import { t, useLanguage } from "../core/i18n";
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
  useLanguage();
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
          {" "}
          {t("EPISODE")} {entry.watchedEpisodes}{" "}
          <span className="muted">/ {entry.totalEpisodes ?? "?"}</span>
        </span>
        <div className="stepper">
          <button
            className="icon-button"
            aria-label={t("Remove one episode from {value0}", {
              value0: entry.preferredTitle,
            })}
            disabled={entry.watchedEpisodes === 0}
            onClick={() => void store.adjustEpisodes(entry.localId, -1)}
          >
            <Minus size={14} />
          </button>
          {!compact && (
            <input
              aria-label={t("Watched episodes")}
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
            aria-label={t("Add one episode to {value0}", {
              value0: entry.preferredTitle,
            })}
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
            transform: `scaleX(${entry.totalEpisodes ? entry.watchedEpisodes / entry.totalEpisodes : 0})`,
          }}
        />
      </div>
      {full && (
        <button
          className="inline-complete"
          onClick={() => {
            void store.complete(entry.localId).then((result) => {
              if (result.ok)
                store.notify(
                  "Completed. Add a rating or a thought whenever you like.",
                );
            });
          }}
        >
          <Check size={13} /> {t("Mark as completed?")}{" "}
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
  useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const exitAnimation = useRef<Animation | null>(null);
  const close = (immediate = false) => {
    if (exitAnimation.current) return;
    const dialog = ref.current;
    if (
      immediate ||
      !dialog ||
      document.documentElement.dataset.reducedMotion === "true"
    ) {
      closeRef.current();
      return;
    }
    exitAnimation.current = dialog.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(.98)" },
      ],
      { duration: 160, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" },
    );
    void exitAnimation.current.finished
      .then(() => closeRef.current())
      .catch(() => {});
  };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      exitAnimation.current?.cancel();
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
            close();
        }
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          autoFocus
          className="icon-button"
          onClick={(e) => close(e.detail === 0)}
          aria-label={t("Close dialog")}
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
  useLanguage();
  return (
    <div className="empty">
      <h2>{t(title)}</h2>
      <p>{t(text)}</p>
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
  useLanguage();
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
  onInteractionChange,
}: {
  entry?: Entry;
  anime?: Anime;
  onOpen: () => void;
  onContext?: (e: React.MouseEvent) => void;
  tracking?: boolean;
  onInteractionChange?: (active: boolean) => void;
}) {
  useLanguage();
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
    onInteractionChange?.(busy || ratingOpen || !!feedback);
  }, [busy, ratingOpen, feedback, onInteractionChange]);
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
      if (!entry && !(await store.add(m)).ok) return;
      const saved = useApp
        .getState()
        .data.entries.find((e) => e.anilistId === m.anilistId);
      if (saved && patch && !(await store.edit(saved.localId, patch)).ok)
        return;
      if (saved)
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
        aria-label={t("Open {value0}", { value0: title })}
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
        {entry && (
          <span className="cover-status">{t(entry.personalStatus)}</span>
        )}
      </button>
      <div
        className="card-actions"
        aria-label={t("Quick actions for {value0}", { value0: title })}
      >
        <button
          className="icon-button"
          disabled={busy || !!entry}
          aria-label={
            entry ? `${title} is in your library` : `Add ${title} to Watchlist`
          }
          title={entry ? t("In your library") : t("Add to Watchlist")}
          onClick={() => void act()}
        >
          <Bookmark size={15} fill={entry ? "currentColor" : "none"} />
        </button>
        <button
          className="icon-button"
          disabled={busy}
          aria-label={t("Like {value0}", { value0: title })}
          aria-pressed={entry?.liked ?? false}
          title={t("Like")}
          onClick={() => void act({ liked: !entry?.liked })}
        >
          <Heart size={15} fill={entry?.liked ? "currentColor" : "none"} />
        </button>
        <button
          className="icon-button"
          aria-label={t("Rate {value0}", { value0: title })}
          title={t("Rate")}
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
          aria-label={t("Mark {value0} as watched", { value0: title })}
          title={t("Mark as watched")}
          onClick={() => void act({ personalStatus: "Completed" })}
        >
          <Eye size={15} />
        </button>
      </div>
      {feedback === "Completed" && (
        <span className="card-confirmation" role="status">
          <Check size={14} /> {t("Completed")}{" "}
        </span>
      )}
      {ratingOpen && (
        <Modal
          title={t("Rate {value0}", { value0: title })}
          onClose={() => setRatingOpen(false)}
        >
          <p className="muted">{t("Your rating · saved to your collection")}</p>
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
            aria-label={t("Add one episode to {value0}", { value0: title })}
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
        <button onClick={onOpen} title={title}>
          {title}
        </button>
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
              {entry.watchedEpisodes}/{entry.totalEpisodes ?? "?"}{" "}
              {t("ep")}{" "}
            </span>
          </div>
        )
      ) : (
        <div className="card-meta">
          <span>
            {m.format?.replaceAll("_", " ") ?? "Anime"} · {m.episodes ?? "?"}{" "}
            {t("episodes")}{" "}
          </span>
          <span>
            {m.averageScore ?? "—"} <small>{t("AL")}</small>
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
  useLanguage();
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(o.replaceAll("_", " "))}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SampleCovers() {
  useLanguage();
  return (
    <div className="sample-covers" aria-label={t("Sample anime artwork")}>
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
