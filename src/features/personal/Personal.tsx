import { usePageActive } from "../../core/activity";
import { t, useLanguage, resolveLanguage } from "../../core/i18n";
import { personalize } from "../../domain/personalized";
import { Spotlight } from "./Spotlight";
import { useReducedMotion } from "../../core/motion";
import {
  recentFirst,
  homeSpotlight,
  availableEpisodes,
} from "../../domain/tonight";
import { localDayRange, localTime, localTimeZone } from "../../core/localTime";
import { useAiring, useClock, useRefreshEpisodes } from "../../core/airing";
import { useEffect, useState, useRef, useMemo } from "react";
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
  useLanguage();
  const pageActive = usePageActive();
  const data = useApp((state) => state.data);
  const prefs = useApp((state) => state.prefs);
  const now = useClock(data.preferences.section === "Home");
  const reducedMotion = useReducedMotion();
  useRefreshEpisodes(data.preferences.section === "Home", now);
  const rail = useRef<HTMLDivElement>(null);
  const [railBounds, setRailBounds] = useState({ start: true, end: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () =>
      setRailBounds({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [data.entries, data.preferences.section, pageActive]);
  const scrollRail = (direction: number) => {
    const el = rail.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const step =
      card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
    const target =
      Math.round(el.scrollLeft / step) * step +
      direction * step * Math.max(1, Math.floor(el.clientWidth / step));
    el.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
  };
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
    if (!pageActive || data.preferences.section !== "Home") return;
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
  }, [data.entries, data.preferences.section, pageActive]);
  const spotlight =
    data.entries.find(
      (e) =>
        e.localId === spotlightId &&
        ["Planning", "Watching", "Rewatching"].includes(e.personalStatus) &&
        availableEpisodes(e, now) > 0,
    ) ?? homeSpotlight(data.entries, now);
  const [today, tomorrow] = localDayRange(now);
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
    ? t("Around now · {from}–{to}", {
        from: localTime(Math.max(recentCutoff, today.getTime())),
        to: localTime(windowEnd),
      })
    : upcoming.length
      ? t("Up next today")
      : t("Today’s latest emissions · schedule finished");
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
    if (!pageActive || !navigator.onLine || data.preferences.section !== "Home")
      return;
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
  }, [data.preferences.adultContent, data.preferences.section, pageActive]);
  const recommendations = useMemo(
    () =>
      personalize(
        season,
        data.entries,
        data.profile.favoriteIds,
        data.preferences.hiddenRecommendations,
        data.preferences.adultContent,
      ).slice(0, 3),
    [
      season,
      data.entries,
      data.profile.favoriteIds,
      data.preferences.hiddenRecommendations,
      data.preferences.adultContent,
    ],
  );
  const affinity = recommendations.some((pick) => pick.personalized);
  return (
    <div className="page home-page">
      <PageTitle
        title={t("Home")}
        subtitle={today.toLocaleDateString(
          resolveLanguage(useApp.getState().data.preferences.language),
          {
            weekday: "long",
            month: "long",
            day: "numeric",
          },
        )}
      />
      {!data.entries.length && (
        <section className="home-welcome">
          <div className="welcome-copy">
            <h2>{t("What are you watching?")}</h2>
            <div className="welcome-actions">
              <button className="button primary" onClick={onSearch}>
                <Plus size={16} /> {t("Add anime")}{" "}
              </button>
              <button className="text-button" onClick={onSample}>
                {" "}
                {t("Try a sample")} <ArrowRight size={14} />
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
              {" "}
              {t("Airing today")}{" "}
              <span className="section-count">{airing.items.length}</span>
            </h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Calendar" })}
            >
              {" "}
              {t("Calendar")} <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="airing-timezone">
            {t("Local time ·")} {localTimeZone()}
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
                        {localTime(air.airingAt * 1000)} {t("· EP")}{" "}
                        {air.episode}
                      </small>
                      <strong>{a.english ?? a.romaji}</strong>
                      <em>
                        {air.airingAt * 1000 <= now
                          ? air.airingAt * 1000 >= recentCutoff
                            ? t("Just aired")
                            : t("Aired today")
                          : t("In {minutes} min", {
                              minutes: Math.ceil(
                                (air.airingAt * 1000 - now) / 60000,
                              ),
                            })}
                      </em>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="prose muted">
              {airing.loading
                ? t("Checking today’s schedule…")
                : airing.error || "No episodes scheduled for today."}
            </p>
          )}
          {airing.items.length > 3 && (
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Calendar" })}
            >
              {" "}
              {t("View all")} {airing.items.length} {t("emissions")}{" "}
              <ArrowUpRight size={14} />
            </button>
          )}
        </section>
      </div>
      <section className="home-section">
        <div className="section-heading">
          <h2>{t("Continue watching")}</h2>
          <div className="continue-controls">
            <button
              className="icon-button"
              aria-label={t("Scroll anime left")}
              disabled={railBounds.start}
              onClick={() => scrollRail(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label={t("Scroll anime right")}
              disabled={railBounds.end}
              onClick={() => scrollRail(1)}
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
            {" "}
            {t("View all")} <ArrowUpRight size={14} />
          </button>
        </div>
        {watching.length ? (
          <div
            className="continue-grid"
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label={t("Continue watching anime")}
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
              ? t("Your current anime is ready above.")
              : t("Mark an anime as Watching to keep your next episode here.")}
          </p>
        )}
      </section>
      {season.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>{t("This season")}</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Discover" })}
            >
              {" "}
              {t("Discover")} <ArrowUpRight size={14} />
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
            <h2>{affinity ? t("Picked for you") : t("Worth a look")}</h2>
            <button
              className="text-button"
              onClick={() => void prefs({ section: "Recommend" })}
            >
              {" "}
              {t("Find another")} <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="muted recommendation-reason">
            {affinity
              ? t(
                  "Seasonal picks based on your favorites, likes and ratings of 8/10 or higher.",
                )
              : t("A few highly rated titles from this season.")}
          </p>
          <div className="home-recommendations">
            {recommendations.map(({ anime: a }) => (
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
          <h2>{t("Open collection")}</h2>
          <ArrowUpRight size={20} />
        </button>
      )}
    </div>
  );
}

export function Diary({ onOpen, onSearch }: Props) {
  useLanguage();
  const data = useApp((state) => state.data);
  const [kind, setKind] = useState("All");
  const events = [...data.history]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((h) => kind === "All" || h.kind === kind);
  return (
    <div className="page diary-page">
      <PageTitle
        title={t("Diary")}
        subtitle={t("Your viewing history, one moment at a time")}
      />
      <div className="diary-summary">
        <span>
          <strong>
            {data.history
              .filter((h) => h.kind === "episode")
              .reduce((n, h) => n + Math.max(0, h.episodeDelta), 0)}
          </strong>{" "}
          {t("episodes logged")}{" "}
        </span>
        <span>
          <strong>
            {data.history.filter((h) => h.kind === "completed").length}
          </strong>{" "}
          {t("completions")}{" "}
        </span>
        <span>
          <strong>
            {data.history.filter((h) => h.kind === "review").length}
          </strong>{" "}
          {t("review updates")}{" "}
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
          title={t("No activity yet")}
          text={t("Your progress and ratings will appear here.")}
          action={t("Find an anime")}
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
                          .toLocaleString(
                            resolveLanguage(
                              useApp.getState().data.preferences.language,
                            ),
                            { month: "short" },
                          )
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
                    {date.toLocaleTimeString(
                      resolveLanguage(
                        useApp.getState().data.preferences.language,
                      ),
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
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
          {" "}
          {t(
            "Showing the most recent 500 events. Your backup contains the complete diary.",
          )}{" "}
        </p>
      )}
    </div>
  );
}
