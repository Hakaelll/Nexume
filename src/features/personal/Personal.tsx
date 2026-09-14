import { Spotlight } from "./Spotlight";
import { useReducedMotion } from "../../core/motion";
import {
  recentFirst,
  homeSpotlight,
  availableEpisodes,
} from "../../domain/tonight";
import {
  spainDayRange,
  spainTime,
  SPAIN_TIME_ZONE,
} from "../../core/spainTime";
import { useAiring, useClock, useRefreshEpisodes } from "../../core/airing";
import { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const now = useClock(data.preferences.section === "Home");
  const reducedMotion = useReducedMotion();
  useRefreshEpisodes(data.preferences.section === "Home", now);
  const rail = useRef<HTMLDivElement>(null);
  const [spotlightId, setSpotlightId] = useState(
    () => homeSpotlight(data.entries)?.localId,
  );
  const wasHome = useRef(false);
  useEffect(() => {
    const active = data.preferences.section === "Home";
    if (active && (!wasHome.current || !spotlightId))
      setSpotlightId(
        homeSpotlight(data.entries, Date.now(), spotlightId)?.localId,
      );
    wasHome.current = active;
  }, [data.preferences.section, data.entries, spotlightId]);
  useEffect(() => {
    if (data.preferences.section !== "Home") return;
    const timer = setInterval(() => {
      if (
        document.hidden ||
        rail.current
          ?.closest(".home-page")
          ?.querySelector(".home-spotlight")
          ?.matches(":hover, :focus-within")
      )
        return;
      setSpotlightId(
        (previous) =>
          homeSpotlight(data.entries, Date.now(), previous)?.localId,
      );
    }, 30000);
    return () => clearInterval(timer);
  }, [data.entries, data.preferences.section]);
  const spotlight =
    data.entries.find(
      (e) =>
        e.localId === spotlightId &&
        ["Planning", "Watching", "Rewatching"].includes(e.personalStatus) &&
        availableEpisodes(e, now) > 0,
    ) ?? homeSpotlight(data.entries, now);
  const [today, tomorrow] = spainDayRange(now);
  const airing = useAiring(
    today,
    tomorrow,
    false,
    data.preferences.section === "Home",
  );
  const recentCutoff = now - 30 * 60000;
  const windowEnd = Math.min(now + 3 * 3600000, tomorrow.getTime());
  const inWindow = airing.items.filter((anime) => {
    const time = anime.nextAiringEpisode!.airingAt * 1000;
    return time >= recentCutoff && time < windowEnd;
  });
  const upcoming = airing.items.filter(
    (anime) => anime.nextAiringEpisode!.airingAt * 1000 >= now,
  );
  const visibleAirings = inWindow.length
    ? inWindow.slice(0, 3)
    : upcoming.length
      ? upcoming.slice(0, 3)
      : airing.items.slice(-3).reverse();
  const airingCaption = inWindow.length
    ? `Around now · ${spainTime(Math.max(recentCutoff, today.getTime()))}–${spainTime(windowEnd)}`
    : upcoming.length
      ? "Up next today"
      : "Today’s latest emissions · schedule finished";
  const watching = data.entries
    .filter(
      (e) =>
        ["Watching", "Rewatching"].includes(e.personalStatus) ||
        (e.personalStatus === "Paused" && e.watchedEpisodes > 0),
    )
    .sort(recentFirst);
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
          timeZone: SPAIN_TIME_ZONE,
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
      <div className="home-opening">
        {data.entries.length > 0 && (
          <Spotlight
            key={spotlight?.localId ?? "empty"}
            entry={spotlight}
            onOpen={onOpen}
          />
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
          <p className="airing-timezone">
            España peninsular · Europe/Madrid · Canarias: una hora menos
          </p>
          {airing.items.length > 0 && (
            <p className="airing-timezone">{airingCaption}</p>
          )}
          {airing.items.length ? (
            <div className="today-airing-grid">
              {visibleAirings.map((a) => {
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
                        {spainTime(air.airingAt * 1000)} · EP {air.episode}
                      </small>
                      <strong>{a.english ?? a.romaji}</strong>
                      <em>
                        {air.airingAt * 1000 <= now
                          ? air.airingAt * 1000 >= recentCutoff
                            ? "Just aired"
                            : "Aired today"
                          : `In ${Math.ceil((air.airingAt * 1000 - now) / 60000)} min`}
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
          {airing.items.length > 3 && (
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Calendar" })}
            >
              View all {airing.items.length} emissions{" "}
              <ArrowUpRight size={14} />
            </button>
          )}
        </section>
      </div>
      <section className="home-section">
        <div className="section-heading">
          <h2>Continue watching</h2>
          <div className="continue-controls">
            <button
              className="icon-button"
              aria-label="Scroll anime left"
              onClick={() =>
                rail.current?.scrollBy({
                  left: -rail.current.clientWidth * 0.85,
                  behavior: reducedMotion ? "auto" : "smooth",
                })
              }
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Scroll anime right"
              onClick={() =>
                rail.current?.scrollBy({
                  left: rail.current.clientWidth * 0.85,
                  behavior: reducedMotion ? "auto" : "smooth",
                })
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
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
          <div
            className="continue-grid"
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label="Continue watching anime"
          >
            {watching.map((e) => (
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
            {watching.length
              ? "Your current anime is ready above."
              : "Mark an anime as Watching to keep your next episode here."}
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
