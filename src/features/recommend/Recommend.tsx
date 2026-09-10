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
  const store = useApp();
  const [source, setSource] = useState(
    store.data.entries.some((e) => e.personalStatus === "Planning")
      ? "Watchlist"
      : store.data.entries.length
        ? "Library"
        : "Sample catalog",
  );
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxEpisodes, setMaxEpisodes] = useState("");
  const [catalog, setCatalog] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [winner, setWinner] = useState<Anime | null>(null);
  const [rolling, setRolling] = useState<Anime | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setError("");
    setCatalog([]);
    if (source === "Library" || source === "Watchlist") {
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
  const pool = useMemo(
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
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    setSpinning(false);
    setWinner(null);
    setRolling(null);
    return () => {
      // This ref is a cancellation counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [source, genre, format, minYear, maxEpisodes]);
  const spin = () => {
    const chosen = pickRecommendation(pool, winner?.anilistId);
    if (!chosen) return;
    const token = ++generation.current;
    const reduced =
      store.data.preferences.reducedMotion ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSpinning(true);
    setWinner(null);
    let step = 0;
    const frames = reduced ? 1 : 14;
    const tick = () => {
      if (token !== generation.current) return;
      if (step >= frames) {
        setWinner(chosen);
        setRolling(null);
        setSpinning(false);
        return;
      }
      setRolling(pool[step % pool.length]);
      step++;
      timer.current = setTimeout(tick, reduced ? 80 : 55 + step * 12);
    };
    tick();
  };
  const shown = rolling ?? winner;
  const existing =
    shown && store.data.entries.find((e) => e.anilistId === shown.anilistId);
  return (
    <div className="page recommendation-page">
      <PageTitle title="What to watch" />
      <div className="recommendation-layout">
        <aside className="recommendation-filters">
          <label className="field">
            Choose from
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {["Watchlist", "Library", "AniList", "Sample catalog"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
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
            {loading ? "Loading…" : `${pool.length} matching anime`}
            {source === "AniList" ? " · popular results" : ""}
          </p>
          {error && (
            <div role="alert" className="error-inline">
              {error}
              <button
                className="text-button"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry
              </button>
            </div>
          )}
        </aside>
        <section
          className={`recommendation-stage ${spinning ? "is-spinning" : ""}`}
          aria-busy={spinning}
        >
          <div className="recommendation-orbit" aria-hidden="true" />
          {shown ? (
            <div
              className={`recommendation-result ${winner ? "is-revealed" : ""}`}
              key={shown.anilistId}
            >
              <Artwork
                src={shown.coverImage}
                title={shown.english ?? shown.romaji}
                eager
              />
              <div
                className="recommendation-copy"
                aria-live={spinning ? "off" : "polite"}
              >
                <h2>{shown.english ?? shown.romaji}</h2>
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
                      <button
                        className="button primary"
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
              <div className="shuffle-emblem">
                <Shuffle size={42} strokeWidth={1} />
              </div>
              <h2>
                {pool.length
                  ? "Let chance choose."
                  : loading
                    ? "Finding anime…"
                    : "No matching anime"}
              </h2>
              <p>
                {pool.length
                  ? "Pick one from your selection."
                  : "Try different filters or another source."}
              </p>
            </div>
          )}
          <button
            className="button primary recommendation-spin"
            onClick={spin}
            disabled={loading || spinning || !pool.length}
          >
            <Shuffle size={17} />
            {spinning ? "Choosing…" : winner ? "Pick another" : "Pick an anime"}
          </button>
        </section>
      </div>
    </div>
  );
}
