import { useAiring, useClock, dayStart } from "../../core/airing";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Plus } from "lucide-react";
import { useApp } from "../../app/store";
import { type Entry, type Anime } from "../../domain/model";
import {
  AnimeCard,
  Artwork,
  Empty,
  PageTitle,
  Stars,
  SampleCovers,
} from "../../components/ui";
import { anilist, seasonNow } from "../../services/anilist/provider";
interface Props {
  onOpen: (e: Entry) => void;
  onSearch: () => void;
}
export function Home({
  onOpen,
  onSearch,
  onSample,
  onAnime,
}: { onSample: () => void; onAnime: (a: Anime) => void } & Props) {
  const { data, prefs } = useApp();
  const now = useClock();
  const today = dayStart(new Date(now));
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const airing = useAiring(today, tomorrow);
  const watching = data.entries.filter((e) =>
    ["Watching", "Rewatching"].includes(e.personalStatus),
  );
  const [season, setSeason] = useState<Anime[]>([]);
  useEffect(() => {
    const c = new AbortController();
    if (!navigator.onLine) return;
    anilist
      .search(
        { ...seasonNow(), adult: data.preferences.adultContent },
        c.signal,
      )
      .then((r) => {
        if (!c.signal.aborted) setSeason(r.items);
      })
      .catch(() => {});
    return () => c.abort();
  }, [data.preferences.adultContent]);
  const affinity = new Set(
    data.entries
      .filter(
        (e) =>
          ["Watching", "Rewatching"].includes(e.personalStatus) ||
          (e.personalRating ?? 0) >= 8,
      )
      .flatMap((e) => e.cachedMetadata.genres),
  );
  const recommendations = [...season]
    .filter((a) => !data.entries.some((e) => e.anilistId === a.anilistId))
    .sort(
      (a, b) =>
        b.genres.filter((g) => affinity.has(g)).length -
          a.genres.filter((g) => affinity.has(g)).length ||
        (b.averageScore ?? 0) - (a.averageScore ?? 0),
    )
    .slice(0, 3);
  return (
    <div className="page home-page">
      <PageTitle
        title="Home"
        subtitle={today.toLocaleDateString("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />
      {!data.entries.length && (
        <section className="home-welcome">
          <div className="welcome-copy">
            <h2>What are you watching?</h2>
            <div className="welcome-actions">
              <button className="button primary" onClick={onSearch}>
                <Plus size={16} />
                Add anime
              </button>
              <button className="text-button" onClick={onSample}>
                Try a sample
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <SampleCovers />
        </section>
      )}
      <section className="home-section today-section">
        <div className="section-heading">
          <h2>
            Airing today{" "}
            <span className="section-count">{airing.items.length}</span>
          </h2>
          <button
            className="text-button"
            onClick={() => void prefs({ section: "Calendar" })}
          >
            Calendar
            <ArrowUpRight size={14} />
          </button>
        </div>
        {airing.items.length ? (
          <div className="today-airing-grid">
            {airing.items.map((a) => {
              const air = a.nextAiringEpisode!;
              return (
                <button
                  className="today-airing-card"
                  key={`${a.anilistId}-${air.episode}`}
                  onClick={() => onAnime(a)}
                >
                  <Artwork
                    src={a.coverLarge || a.coverImage}
                    title={a.english ?? a.romaji}
                  />
                  <span>
                    <small>
                      {new Date(air.airingAt * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · EP {air.episode}
                    </small>
                    <strong>{a.english ?? a.romaji}</strong>
                    <em>
                      {air.airingAt * 1000 < now
                        ? "Aired today"
                        : "Later today"}
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="prose muted">
            {airing.loading
              ? "Checking today’s schedule…"
              : airing.error || "No episodes scheduled for today."}
          </p>
        )}
      </section>
      <section className="home-section">
        <div className="section-heading">
          <h2>Continue watching</h2>
          <button
            className="text-button"
            onClick={() =>
              void prefs({
                section: "Library",
                filter: "Watching",
                view: "Grid",
              })
            }
          >
            View all
            <ArrowUpRight size={14} />
          </button>
        </div>
        {watching.length ? (
          <div className="continue-grid">
            {watching.slice(0, 6).map((e) => (
              <AnimeCard
                entry={e}
                tracking
                key={e.localId}
                onOpen={() => onOpen(e)}
              />
            ))}
          </div>
        ) : (
          <p className="prose muted">
            Mark an anime as Watching to keep your next episode here.
          </p>
        )}
      </section>
      {season.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>This season</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Discover" })}
            >
              Discover
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="poster-grid">
            {season.slice(0, 6).map((a) => (
              <AnimeCard
                key={a.anilistId}
                anime={a}
                onOpen={() => onAnime(a)}
              />
            ))}
          </div>
        </section>
      )}
      {recommendations.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>{affinity.size ? "Picked for you" : "Worth a look"}</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Recommend" })}
            >
              Find another
              <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="muted recommendation-reason">
            {affinity.size
              ? "Seasonal picks based on genres in your watching and highly rated anime."
              : "A few highly rated titles from this season."}
          </p>
          <div className="home-recommendations">
            {recommendations.map((a) => (
              <AnimeCard
                key={a.anilistId}
                anime={a}
                onOpen={() => onAnime(a)}
              />
            ))}
          </div>
        </section>
      )}
      {data.entries.length > 0 && (
        <button
          className="collection-invitation"
          onClick={() =>
            void prefs({
              section: "Library",
              view: "Collection",
              filter: "All",
            })
          }
        >
          <div className="collection-preview-covers">
            {data.entries.slice(0, 4).map((e) => (
              <Artwork
                key={e.localId}
                src={e.coverImage}
                title={e.preferredTitle}
              />
            ))}
          </div>
          <h2>Open collection</h2>
          <ArrowUpRight size={20} />
        </button>
      )}
    </div>
  );
}

export function Diary({ onOpen, onSearch }: Props) {
  const { data } = useApp();
  const [kind, setKind] = useState("All");
  const events = [...data.history]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((h) => kind === "All" || h.kind === kind);
  return (
    <div className="page diary-page">
      <PageTitle
        title="Diary"
        subtitle="Your viewing history, one moment at a time"
      />
      <div className="diary-summary">
        <span>
          <strong>
            {data.history
              .filter((h) => h.kind === "episode")
              .reduce((n, h) => n + Math.max(0, h.episodeDelta), 0)}
          </strong>{" "}
          episodes logged
        </span>
        <span>
          <strong>
            {data.history.filter((h) => h.kind === "completed").length}
          </strong>{" "}
          completions
        </span>
        <span>
          <strong>
            {data.history.filter((h) => h.kind === "review").length}
          </strong>{" "}
          review updates
        </span>
      </div>
      <div className="discover-tabs">
        {[
          "All",
          "episode",
          "started",
          "completed",
          "rewatch",
          "rating",
          "review",
        ].map((k) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => setKind(k)}
          >
            {k}
          </button>
        ))}
      </div>
      {!events.length ? (
        <Empty
          title="No activity yet"
          text="Your progress and ratings will appear here."
          action="Find an anime"
          onAction={onSearch}
        />
      ) : (
        <div className="diary-timeline">
          {events.slice(0, 500).map((h, i) => {
            const e = data.entries.find((e) => e.localId === h.entryId);
            if (!e) return null;
            const date = new Date(h.at);
            const first =
              i === 0 ||
              new Date(events[i - 1].at).toDateString() !== date.toDateString();
            return (
              <article className="diary-event" data-kind={h.kind} key={h.id}>
                <div className="diary-date">
                  {first && (
                    <>
                      <strong>
                        {date.getDate().toString().padStart(2, "0")}
                      </strong>
                      <span>
                        {date
                          .toLocaleString("en", { month: "short" })
                          .toUpperCase()}{" "}
                        {date.getFullYear()}
                      </span>
                    </>
                  )}
                </div>
                <button className="diary-cover" onClick={() => onOpen(e)}>
                  <Artwork src={e.coverImage} title={e.preferredTitle} />
                </button>
                <div>
                  <small className="eyebrow">
                    {h.kind.toUpperCase()} ·{" "}
                    {date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                  <button className="diary-title" onClick={() => onOpen(e)}>
                    {e.preferredTitle}
                  </button>
                  <p>{h.detail}</p>
                </div>
                <Stars value={e.personalRating} />
              </article>
            );
          })}
        </div>
      )}
      {events.length > 500 && (
        <p className="muted">
          Showing the most recent 500 events. Your backup contains the complete
          diary.
        </p>
      )}
    </div>
  );
}
export { default as Calendar } from "./Calendar";
export { default as Stats } from "./Statistics";
