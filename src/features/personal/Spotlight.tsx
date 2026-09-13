import { useState } from "react";
import { ArrowUpRight, Plus, Shuffle } from "lucide-react";
import type { Entry } from "../../domain/model";
import { useApp } from "../../app/store";
import { openRecommend } from "../../app/session";
import { Artwork } from "../../components/ui";
import { animeCover } from "../../domain/artwork";

export function Spotlight({
  entry,
  onOpen,
}: {
  entry: Entry | null;
  onOpen: (entry: Entry) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!entry)
    return (
      <section className="home-spotlight">
        <div>
          <h2>Ready for a new story?</h2>
          <button
            className="button"
            onClick={() =>
              openRecommend({
                source: "Watchlist",
                genre: "",
                guided: true,
                intent: "start",
              })
            }
          >
            <Shuffle size={16} />
            What fits tonight?
          </button>
        </div>
      </section>
    );
  const planned = entry.personalStatus === "Planning";
  const full =
    entry.totalEpisodes !== null &&
    entry.watchedEpisodes >= entry.totalEpisodes;
  const progress = entry.totalEpisodes
    ? Math.min(100, (entry.watchedEpisodes / entry.totalEpisodes) * 100)
    : null;
  const log = async () => {
    setBusy(true);
    setMessage("");
    await useApp.getState().adjustEpisodes(entry.localId, 1);
    if (!useApp.getState().error) setMessage("Episode logged");
    setBusy(false);
  };
  return (
    <section className="home-spotlight" data-anime-id={entry.anilistId}>
      <div className="spotlight-content">
        <button
          className="spotlight-cover"
          onClick={() => onOpen(entry)}
          aria-label={`Open ${entry.preferredTitle}`}
        >
          <Artwork
            src={animeCover(entry.cachedMetadata, entry.coverImage)}
            fallbackSrc={entry.coverImage}
            title={entry.preferredTitle}
            eager
          />
          <span className="spotlight-cover-open" aria-hidden="true">
            <ArrowUpRight size={20} />
          </span>
        </button>
        <div className="spotlight-copy">
          <p className="eyebrow">
            <span className="spotlight-signal" aria-hidden="true" />
            {planned ? "Next on your Watchlist" : "Your next episode"}
          </p>
          <h2>{entry.preferredTitle}</h2>
          {!planned && (
            <div className="spotlight-progress">
              <div className="spotlight-progress-caption">
                <span>{entry.watchedEpisodes} episodes watched</span>
                {progress !== null && <span>{Math.round(progress)}%</span>}
              </div>
              {progress !== null && (
                <div
                  className="spotlight-progress-track"
                  role="progressbar"
                  aria-label="Episodes watched"
                  aria-valuenow={entry.watchedEpisodes}
                  aria-valuemin={0}
                  aria-valuemax={entry.totalEpisodes!}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}
          <div className="welcome-actions">
            <button className="button primary" onClick={() => onOpen(entry)}>
              Open anime <ArrowUpRight size={16} />
            </button>
            {!planned && (
              <button
                className="button"
                disabled={busy || full}
                onClick={() => void log()}
              >
                <Plus size={16} />
                {busy ? "Saving…" : "Log episode"}
              </button>
            )}
          </div>
          <button
            className="text-button spotlight-tonight"
            onClick={() =>
              openRecommend({
                source: planned ? "Watchlist" : "Library",
                genre: "",
                guided: true,
                intent: planned ? "start" : "continue",
              })
            }
          >
            <Shuffle size={15} />
            What fits tonight?
          </button>
          <span className="spotlight-feedback" role="status">
            {message}
          </span>
        </div>
      </div>
    </section>
  );
}
