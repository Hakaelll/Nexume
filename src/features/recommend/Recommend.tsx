import { useSession } from "../../app/session";
import { evaluateTonight } from "../../domain/tonight";
import { useReducedMotion } from "../../core/motion";
import { animeCover } from "../../domain/artwork";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle, BookmarkPlus, ArrowUpRight, RotateCcw } from "lucide-react";
import { useApp } from "../../app/store";
import { Artwork, PageTitle } from "../../components/ui";
import type { Anime } from "../../domain/model";
import {
  filterRecommendations,
  pickRecommendation,
} from "../../domain/recommendation";
import { anilist } from "../../services/anilist/provider";
import { sampleEntries } from "../../core/sample";
const genres = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];
export default function Recommend({
  onOpen,
}: {
  onOpen: (anime: Anime) => void;
}) {
  const reducedMotion = useReducedMotion();
  const store = useApp();
  const context = useSession((state) => state.recommend);
  const [guided, setGuided] = useState(context?.guided ?? false);
  const [intent, setIntent] = useState<"start" | "continue">(
    context?.intent ?? "start",
  );
  const [minutes, setMinutes] = useState("25");
  const [customMinutes, setCustomMinutes] = useState("60");
  const [source, setSource] = useState<string>(
    context?.source ??
      (store.data.entries.some((e) => e.personalStatus === "Planning")
        ? "Watchlist"
        : store.data.entries.length
          ? "Library"
          : "Sample catalog"),
  );
  const [genre, setGenre] = useState(context?.genre ?? "");
  const [format, setFormat] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxEpisodes, setMaxEpisodes] = useState("");
  const [catalog, setCatalog] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [winner, setWinner] = useState<Anime | null>(null);
  const [reel, setReel] = useState<Anime[]>([]);
  const [spinning, setSpinning] = useState(false);
  const pendingWinner = useRef<Anime | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const drawController = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setError("");
    setCatalog([]);
    if (
      source === "Library" ||
      source === "Watchlist" ||
      source === "AniList"
    ) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const request =
      source === "Sample catalog"
        ? sampleEntries().then((es) =>
            es.map((e) => ({
              ...e.cachedMetadata,
              coverImage: e.coverImage,
              coverLarge: e.coverImage,
              bannerImage: e.bannerImage,
            })),
          )
        : anilist
            .search(
              {
                genre: genre || undefined,
                format: format || undefined,
                sort: "POPULARITY_DESC",
                adult: store.data.preferences.adultContent,
              },
              controller.signal,
            )
            .then((r) => r.items);
    request
      .then((items) => {
        if (active) setCatalog(items);
      })
      .catch((e) => {
        if (active) setError(String(e instanceof Error ? e.message : e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [source, genre, format, retry, store.data.preferences.adultContent]);
  const catalogPool = useMemo(
    () =>
      filterRecommendations(
        source === "Library" || source === "Watchlist"
          ? store.data.entries
              .filter(
                (e) => source === "Library" || e.personalStatus === "Planning",
              )
              .map((e) => ({ ...e.cachedMetadata, coverImage: e.coverImage }))
          : catalog,
        {
          genre,
          format,
          minYear: Number(minYear),
          maxEpisodes: Number(maxEpisodes),
          adult: store.data.preferences.adultContent,
        },
      ),
    [
      source,
      store.data.entries,
      store.data.preferences.adultContent,
      catalog,
      genre,
      format,
      minYear,
      maxEpisodes,
    ],
  );
  useEffect(() => {
    if (!context) return;
    setGuided(context.guided);
    setIntent(context.intent);
    setSource(context.source);
    setGenre(context.genre);
    setFormat("");
    setMinYear("");
    setMaxEpisodes("");
  }, [context]);
  const budget =
    minutes === "any"
      ? null
      : Number(minutes === "custom" ? customMinutes : minutes);
  const eligibleIds = new Set(
    filterRecommendations(
      store.data.entries.map((e) => e.cachedMetadata),
      {
        genre,
        format,
        minYear: Number(minYear),
        maxEpisodes: Number(maxEpisodes),
        adult: store.data.preferences.adultContent,
      },
    ).map((a) => a.anilistId),
  );
  const tonight = evaluateTonight(store.data.entries, {
    minutes: budget,
    intent,
    genre,
    adult: store.data.preferences.adultContent,
    eligibleIds,
  });
  const pool = guided
    ? tonight.candidates.map((c) => c.entry.cachedMetadata)
    : catalogPool;
  const revealWinner = () => {
    if (!pendingWinner.current) return;
    if (timer.current) clearTimeout(timer.current);
    setWinner(pendingWinner.current);
    pendingWinner.current = null;
    setReel([]);
    setSpinning(false);
  };
  useEffect(() => {
    if (reducedMotion && pendingWinner.current) {
      if (timer.current) clearTimeout(timer.current);
      setWinner(pendingWinner.current);
      pendingWinner.current = null;
      setReel([]);
      setSpinning(false);
    }
  }, [reducedMotion]);
  useEffect(() => {
    generation.current++;
    pendingWinner.current = null;
    drawController.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    setSpinning(false);
    setWinner(null);
    setReel([]);
    return () => {
      // This ref is a cancellation counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      drawController.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [
    source,
    genre,
    format,
    minYear,
    maxEpisodes,
    guided,
    intent,
    minutes,
    customMinutes,
    store.data.preferences.adultContent,
  ]);
  const spin = async () => {
    const token = ++generation.current;
    setError("");
    setSpinning(true);
    setWinner(null);
    let candidates = pool;
    if (!guided && source === "AniList") {
      drawController.current?.abort();
      const controller = new AbortController();
      drawController.current = controller;
      try {
        candidates = await anilist.randomCatalog(
          {
            genre,
            format,
            minYear: Number(minYear),
            maxEpisodes: Number(maxEpisodes),
            adult: store.data.preferences.adultContent,
          },
          controller.signal,
        );
      } catch (e) {
        if (token === generation.current) {
          setError(e instanceof Error ? e.message : String(e));
          setSpinning(false);
        }
        return;
      }
      if (token !== generation.current) return;
    }
    const chosen = pickRecommendation(candidates, winner?.anilistId);
    if (!chosen) {
      setSpinning(false);
      return;
    }
    pendingWinner.current = chosen;
    const reduced = reducedMotion;
    if (reduced) {
      revealWinner();
      return;
    }
    setSpinning(true);
    setWinner(null);
    const cards = Array.from(
      { length: 26 },
      () => candidates[Math.floor(Math.random() * candidates.length)],
    );
    cards[22] = chosen;
    setReel(reduced ? [] : cards);
    timer.current = setTimeout(
      () => {
        if (token !== generation.current) return;
        revealWinner();
      },
      reduced ? 80 : 3700,
    );
  };
  const shown = winner;
  const existing =
    shown && store.data.entries.find((e) => e.anilistId === shown.anilistId);
  const filters = (
    <aside className="recommendation-filters">
      <label className="field">
        Choose from
        <select
          disabled={guided}
          value={
            guided ? (intent === "start" ? "Watchlist" : "Library") : source
          }
          onChange={(e) => setSource(e.target.value)}
        >
          {["Watchlist", "Library", "AniList", "Sample catalog"].map((s) => (
            <option key={s} value={s}>
              {s === "AniList" ? "All anime · AniList" : s}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Genre
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Any genre</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="">Any format</option>
          {["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="filter-pair">
        <label className="field">
          Released since
          <input
            type="number"
            min="1900"
            max="2100"
            placeholder="Any year"
            value={minYear}
            onChange={(e) => setMinYear(e.target.value)}
          />
        </label>
        <label className="field">
          Max episodes
          <input
            type="number"
            min="1"
            max="10000"
            placeholder="Any length"
            value={maxEpisodes}
            onChange={(e) => setMaxEpisodes(e.target.value)}
          />
        </label>
      </div>
      <button
        className="text-button"
        onClick={() => {
          setGenre("");
          setFormat("");
          setMinYear("");
          setMaxEpisodes("");
        }}
      >
        <RotateCcw size={13} />
        Reset filters
      </button>
      <p className="muted candidate-count">
        {!guided && source === "AniList"
          ? "AniList · Online"
          : loading
            ? "Loading…"
            : `${pool.length} matching anime`}
      </p>
      {error && (
        <div role="alert" className="error-inline">
          {error}
          <button
            className="text-button"
            onClick={() =>
              source === "AniList" ? void spin() : setRetry((n) => n + 1)
            }
            disabled={spinning}
          >
            Retry
          </button>
        </div>
      )}
    </aside>
  );
  return (
    <div className={`page recommendation-page ${guided ? "is-guided" : ""}`}>
      <PageTitle title="Recommend" />
      <div
        className="tonight-mode"
        role="group"
        aria-label="Recommendation mode"
      >
        <button
          className="button"
          aria-pressed={!guided}
          onClick={() => setGuided(false)}
        >
          Explore & shuffle
        </button>
        <button
          className="button"
          aria-pressed={guided}
          onClick={() => {
            setGuided(true);
            setSource(intent === "start" ? "Watchlist" : "Library");
          }}
        >
          What fits tonight?
        </button>
      </div>
      {guided && (
        <section className="tonight-panel" aria-label="Plan tonight">
          <div>
            <p className="eyebrow">A little time. A good story.</p>
            <h2>What fits tonight?</h2>
            <p>Three picks from your collection, with time to enjoy them.</p>
          </div>
          <div className="tonight-controls">
            <label className="field">
              I want to
              <select
                value={intent}
                onChange={(e) => {
                  setIntent(e.target.value as "start" | "continue");
                  setSource(
                    e.target.value === "start" ? "Watchlist" : "Library",
                  );
                }}
              >
                <option value="continue">Continue an anime</option>
                <option value="start">Start something new</option>
              </select>
            </label>
            <label className="field">
              Time available
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              >
                <option value="25">25 minutes</option>
                <option value="50">50 minutes</option>
                <option value="90">90 minutes</option>
                <option value="custom">Custom duration</option>
                <option value="any">No time limit</option>
              </select>
            </label>
            {minutes === "custom" && (
              <label className="field">
                Minutes
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                />
              </label>
            )}
          </div>
          {filters}
          {budget !== null && (!Number.isFinite(budget) || budget <= 0) && (
            <p role="alert">Enter a duration greater than zero.</p>
          )}
          {tonight.unknownDuration > 0 && (
            <p className="muted">
              {tonight.unknownDuration} anime excluded because their duration is
              unknown. Choose No time limit to include them.
            </p>
          )}
          <div className="tonight-candidates">
            {tonight.candidates.map((c) => (
              <article
                className="tonight-candidate"
                key={c.entry.localId}
                data-anime-id={c.entry.anilistId}
              >
                <button
                  className="tonight-cover"
                  onClick={() => onOpen(c.entry.cachedMetadata)}
                  aria-label={`Open ${c.entry.preferredTitle}`}
                >
                  <Artwork
                    src={animeCover(c.entry.cachedMetadata, c.entry.coverImage)}
                    title={c.entry.preferredTitle}
                  />
                </button>
                <div>
                  <h3>{c.entry.preferredTitle}</h3>
                  <p>
                    {c.entry.cachedMetadata.duration ?? "?"} min
                    {c.entry.cachedMetadata.format === "MOVIE"
                      ? " · Movie"
                      : " / episode"}{" "}
                    · {c.entry.watchedEpisodes}/{c.entry.totalEpisodes ?? "?"}{" "}
                    ep
                  </p>
                  <p>
                    {
                      ["Normal", "Soon", "Next up", "Top priority"][
                        c.entry.priority
                      ]
                    }{" "}
                    · {c.entry.cachedMetadata.genres.join(" · ")}
                  </p>
                  {c.reasons.map((reason) => (
                    <p className="tonight-reason" key={reason}>
                      {reason}
                    </p>
                  ))}
                  <div className="welcome-actions">
                    <button
                      className="button"
                      onClick={() => onOpen(c.entry.cachedMetadata)}
                    >
                      Open anime
                    </button>
                    {c.entry.personalStatus === "Planning" && (
                      <button
                        className="button primary"
                        disabled={store.saving}
                        onClick={() =>
                          void store.edit(c.entry.localId, {
                            personalStatus: "Watching",
                          })
                        }
                      >
                        Start watching
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!tonight.candidates.length && (
            <div className="tonight-empty">
              <h3>No anime fits these filters</h3>
              <p>
                Allow more time or clear your filters to find another story.
              </p>
              <button className="button" onClick={() => setMinutes("any")}>
                No time limit
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setGenre("");
                  setFormat("");
                  setMinYear("");
                  setMaxEpisodes("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      )}
      <div className="recommendation-layout">
        {!guided && filters}
        <section
          className={`recommendation-stage ${spinning ? "is-spinning" : ""}`}
          aria-busy={spinning}
        >
          {spinning ? (
            <div
              className="recommendation-roulette"
              role="status"
              aria-label="Drawing an anime"
            >
              <div className="roulette-pointer" aria-hidden="true" />
              <div className="roulette-window" aria-hidden="true">
                <div
                  className={`roulette-track ${reel.length ? "is-running" : "is-loading"}`}
                >
                  {reel.length
                    ? reel.map((anime, index) => (
                        <div
                          className="roulette-card"
                          key={index}
                          data-anime-id={anime.anilistId}
                        >
                          <Artwork
                            src={animeCover(anime)}
                            title={anime.english ?? anime.romaji}
                            eager
                          />
                          <span>{anime.english ?? anime.romaji}</span>
                        </div>
                      ))
                    : Array.from({ length: 7 }, (_, index) => (
                        <div
                          className="roulette-card roulette-placeholder"
                          key={index}
                        >
                          <Shuffle size={32} />
                        </div>
                      ))}
                </div>
              </div>
              {pendingWinner.current && (
                <button
                  className="button skip-animation"
                  onClick={revealWinner}
                >
                  Skip animation
                </button>
              )}
              <p className="roulette-caption">
                {reel.length
                  ? "Finding your next watch"
                  : "Exploring the catalog"}
              </p>
            </div>
          ) : shown ? (
            <div
              data-anime-id={shown.anilistId}
              className={`recommendation-result ${winner ? "is-revealed" : ""}`}
              key={shown.anilistId}
            >
              <Artwork
                src={animeCover(shown)}
                title={shown.english ?? shown.romaji}
                eager
              />
              <div
                className="recommendation-copy"
                aria-live={spinning ? "off" : "polite"}
              >
                <h2>
                  {spinning ? "Choosing…" : (shown.english ?? shown.romaji)}
                </h2>
                <p>
                  {shown.year ?? "—"} · {shown.format ?? "Anime"} ·{" "}
                  {shown.episodes ?? "?"} episodes
                </p>
                {winner && (
                  <>
                    <div className="genre-chips">
                      {shown.genres.slice(0, 3).map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                    </div>
                    <div className="welcome-actions">
                      <button className="button" onClick={() => onOpen(shown)}>
                        View anime
                        <ArrowUpRight size={14} />
                      </button>
                      {existing?.personalStatus === "Planning" && (
                        <button
                          className="button primary"
                          disabled={store.saving}
                          onClick={() =>
                            void store.edit(existing.localId, {
                              personalStatus: "Watching",
                            })
                          }
                        >
                          Start watching
                        </button>
                      )}
                      <button
                        className="button"
                        disabled={!!existing}
                        onClick={() => void store.add(shown)}
                      >
                        <BookmarkPlus size={15} />
                        {existing ? "In your library" : "Add to Watchlist"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="recommendation-empty">
              <h2>
                {spinning ? (
                  "Exploring the catalog…"
                ) : pool.length || (!guided && source === "AniList") ? (
                  <>
                    What to
                    <br />
                    <em>watch?</em>
                  </>
                ) : loading ? (
                  "Finding anime…"
                ) : (
                  "No matching anime"
                )}
              </h2>
              {!spinning && pool.length > 0 && (
                <div className="recommendation-fan" aria-hidden="true">
                  {pool.slice(0, 5).map((anime) => (
                    <div key={anime.anilistId}>
                      <Artwork
                        src={animeCover(anime)}
                        title={anime.english ?? anime.romaji}
                        eager
                      />
                    </div>
                  ))}
                </div>
              )}
              {!pool.length && (guided || source !== "AniList") && !loading && (
                <p>Try different filters or another source.</p>
              )}
            </div>
          )}
          <button
            className="button primary recommendation-spin"
            onClick={() => void spin()}
            disabled={
              (!guided && loading) ||
              spinning ||
              ((guided || source !== "AniList") && !pool.length)
            }
          >
            <Shuffle size={17} />
            {spinning ? "Choosing…" : winner ? "Pick another" : "Pick an anime"}
          </button>
        </section>
      </div>
    </div>
  );
}
