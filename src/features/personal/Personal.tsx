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
  const watching = data.entries.filter((e) =>
    ["Watching", "Rewatching"].includes(e.personalStatus),
  );
  const recent = [...data.entries]
    .filter((e) => e.lastWatchedDate)
    .sort((a, b) =>
      (b.lastWatchedDate ?? "").localeCompare(a.lastWatchedDate ?? ""),
    )
    .slice(0, 6);
  const [season, setSeason] = useState<Anime[]>([]);
  useEffect(() => {
    if (!navigator.onLine || !data.entries.length) return;
    const c = new AbortController();
    anilist
      .search(
        { ...seasonNow(), adult: data.preferences.adultContent },
        c.signal,
      )
      .then((r) => setSeason(r.items.slice(0, 6)))
      .catch(() => {});
    return () => c.abort();
  }, [data.entries.length, data.preferences.adultContent]);
  return (
    <div className="page home-page">
      <PageTitle title="Home" />
      {watching.length > 0 ? (
        <section>
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
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="continue-grid">
            {watching.slice(0, 5).map((entry) => (
              <AnimeCard
                entry={entry}
                tracking
                key={entry.localId}
                onOpen={() => onOpen(entry)}
              />
            ))}
          </div>
        </section>
      ) : !data.entries.length ? (
        <section className="home-welcome">
          <div className="welcome-copy">
            <h2>What are you watching?</h2>
            <div className="welcome-actions">
              <button className="button primary" onClick={onSearch}>
                <Plus size={16} />
                Add anime
              </button>
              <button className="text-button" onClick={onSample}>
                Try a sample <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <SampleCovers />
        </section>
      ) : null}
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
            {data.entries.slice(0, 4).map((entry) => (
              <Artwork
                key={entry.localId}
                src={entry.coverImage}
                title={entry.preferredTitle}
              />
            ))}
          </div>
          <h2>Open collection</h2>
          <ArrowUpRight size={20} />
        </button>
      )}
      {watching.some((e) => e.cachedMetadata.nextAiringEpisode) && (
        <section className="home-section">
          <div className="section-heading">
            <h2>New episodes</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Calendar" })}
            >
              Calendar
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="airing-strip">
            {watching
              .filter((e) => e.cachedMetadata.nextAiringEpisode)
              .slice(0, 4)
              .map((e) => (
                <button key={e.localId} onClick={() => onOpen(e)}>
                  <span>{e.preferredTitle}</span>
                  <small>
                    Episode {e.cachedMetadata.nextAiringEpisode!.episode} ·{" "}
                    {new Date(
                      e.cachedMetadata.nextAiringEpisode!.airingAt * 1000,
                    ).toLocaleString()}
                  </small>
                </button>
              ))}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Recently watched</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Diary" })}
            >
              Your diary
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="poster-grid">
            {recent.map((e) => (
              <AnimeCard key={e.localId} entry={e} onOpen={() => onOpen(e)} />
            ))}
          </div>
        </section>
      )}
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
            {season.map((a) => (
              <AnimeCard
                key={a.anilistId}
                anime={a}
                onOpen={() => onAnime(a)}
              />
            ))}
          </div>
        </section>
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
    <div className="page">
      <PageTitle title="Diary" />
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
              i === 0 || events[i - 1].at.slice(0, 10) !== h.at.slice(0, 10);
            return (
              <article className="diary-event" key={h.id}>
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
export function Calendar({ onOpen }: Pick<Props, "onOpen">) {
  const { data } = useApp();
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const today = new Date();
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7) + offset * 7,
  );
  const days = Array.from(
    { length: 7 },
    (_, i) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );
  const following = data.entries.filter(
    (e) =>
      ["Watching", "Rewatching", "Planning"].includes(e.personalStatus) &&
      e.cachedMetadata.nextAiringEpisode,
  );
  return (
    <div className="page">
      <PageTitle title="Calendar" subtitle="Upcoming episodes · local time" />
      <div className="calendar-nav">
        <button className="button" onClick={() => setOffset((o) => o - 1)}>
          ← Previous week
        </button>
        <span>
          {monday.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <button className="button" onClick={() => setOffset((o) => o + 1)}>
          Next week →
        </button>
        <button className="text-button" onClick={() => setOffset(0)}>
          Today
        </button>
      </div>
      <div className="week-grid">
        {days.map((day) => (
          <section
            key={day.toISOString()}
            className={
              day.toDateString() === today.toDateString() ? "today" : ""
            }
          >
            <header>
              <span>
                {day
                  .toLocaleDateString("en", { weekday: "short" })
                  .toUpperCase()}
              </span>
              <strong>{day.getDate()}</strong>
            </header>
            {following
              .filter(
                (e) =>
                  new Date(
                    e.cachedMetadata.nextAiringEpisode!.airingAt * 1000,
                  ).toDateString() === day.toDateString(),
              )
              .map((e) => {
                const air = e.cachedMetadata.nextAiringEpisode!;
                const hours = Math.ceil(
                  (air.airingAt * 1000 - clock) / 3600000,
                );
                return (
                  <button
                    key={e.localId}
                    className="calendar-anime"
                    onClick={() => onOpen(e)}
                  >
                    <Artwork src={e.coverImage} title={e.preferredTitle} />
                    <strong>{e.preferredTitle}</strong>
                    <small>
                      EP {air.episode} ·{" "}
                      {new Date(air.airingAt * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    <span>
                      {hours > 0
                        ? `In ${hours < 24 ? `${hours} hours` : `${Math.ceil(hours / 24)} days`}`
                        : "Scheduled time passed"}
                    </span>
                  </button>
                );
              })}
          </section>
        ))}
      </div>
      {!following.length && (
        <p className="prose muted calendar-note">
          No upcoming episodes in your followed anime.
          <br />
          Add an airing series and refresh its metadata to see its schedule.
        </p>
      )}
    </div>
  );
}
export { default as Stats } from "./Statistics";
