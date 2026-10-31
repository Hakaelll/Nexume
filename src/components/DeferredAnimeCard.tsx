import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { t, useLanguage } from "../core/i18n";
import { watchNearViewport } from "../core/viewport";
import { useApp } from "../app/store";
import type { Entry } from "../domain/model";
import { AnimeCard } from "./ui";

export const DeferredAnimeCard = memo(function DeferredAnimeCard({
  entry,
  onOpen,
  onContext,
  variant = "library",
}: {
  entry: Entry;
  onOpen: (entry: Entry) => void;
  onContext?: (
    event: Pick<MouseEvent, "clientX" | "clientY" | "preventDefault">,
    entry: Entry,
  ) => void;
  variant?: "library" | "tracking" | "watchlist";
}) {
  useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [near, setNear] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const loaded = near || pinned || focused || busy;
  const update = async (patch: Partial<Entry>) => {
    setBusy(true);
    try {
      await useApp.getState().edit(entry.localId, patch);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!host.current) return;
    return watchNearViewport(host.current, (visible) => {
      if (visible)
        restoreFocus.current = !!host.current?.contains(document.activeElement);
      setNear(visible);
    });
  }, []);
  useLayoutEffect(() => {
    if (loaded && restoreFocus.current) {
      host.current
        ?.querySelector<HTMLButtonElement>(".cover-button")
        ?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [loaded]);
  const title = entry.preferredTitle;
  return (
    <div
      ref={host}
      className={`library-card-slot ${variant === "tracking" ? "tracking-slot" : variant === "watchlist" ? "watchlist-slot" : ""}`}
      onFocusCapture={() => {
        if (!loaded) restoreFocus.current = true;
        setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {loaded ? (
        <>
          <AnimeCard
            entry={entry}
            tracking={variant === "tracking"}
            onOpen={() => onOpen(entry)}
            onContext={(event) => onContext?.(event, entry)}
            onInteractionChange={setPinned}
          />
          {variant === "watchlist" && (
            <div className="watchlist-actions">
              <button
                className="button"
                disabled={busy}
                onClick={() => void update({ personalStatus: "Watching" })}
              >
                <Play size={13} /> {t("Start watching")}
              </button>
              <select
                aria-label={t("Priority for {value0}", { value0: title })}
                value={entry.priority}
                disabled={busy}
                onChange={(event) => {
                  const priority = ([0, 1, 2, 3] as const).find(
                    (value) => String(value) === event.target.value,
                  );
                  if (priority !== undefined) void update({ priority });
                }}
              >
                <option value="0">{t("Normal")}</option>
                <option value="1">{t("Soon")}</option>
                <option value="2">{t("Next up")}</option>
                <option value="3">{t("Top priority")}</option>
              </select>
            </div>
          )}
        </>
      ) : (
        <article
          className={`anime-card ${variant === "tracking" ? "tracking" : ""}`}
          data-anime-id={entry.anilistId}
          onContextMenu={(event) => onContext?.(event, entry)}
        >
          <button
            className="cover-button"
            onClick={() => onOpen(entry)}
            aria-label={t("Open {value0}", { value0: title })}
          >
            <div className="artwork">
              <div className="cover-placeholder">
                <strong>{title}</strong>
              </div>
            </div>
          </button>
          <div className="card-actions" aria-hidden="true">
            <span className="icon-button" />
          </div>
          <div className="card-title">
            <button onClick={() => onOpen(entry)} title={title}>
              {title}
            </button>
            <span>{entry.cachedMetadata.year ?? "TBA"}</span>
          </div>
          {variant === "tracking" ? (
            <div className="episode-control" aria-hidden="true">
              <div className="episode-line">
                <span className="eyebrow">
                  {t("EPISODE")} {entry.watchedEpisodes} /{" "}
                  {entry.totalEpisodes ?? "?"}
                </span>
                <span className="icon-button" />
              </div>
              <div className="progress-track" />
              {entry.totalEpisodes !== null &&
                entry.watchedEpisodes === entry.totalEpisodes &&
                entry.personalStatus !== "Completed" && (
                  <span className="inline-complete">
                    <Check size={13} /> {t("Mark as completed?")}
                  </span>
                )}
            </div>
          ) : (
            <div className="card-meta">
              <span className="library-rating-placeholder" aria-hidden="true" />
              <span>
                {entry.watchedEpisodes}/{entry.totalEpisodes ?? "?"}{" "}
                {t("ep")}{" "}
              </span>
            </div>
          )}
        </article>
      )}
      {!loaded && variant === "watchlist" && (
        <div className="watchlist-actions" aria-hidden="true" />
      )}
    </div>
  );
});
