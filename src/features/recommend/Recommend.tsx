import { usePageActive } from "../../core/activity";
import { t, useLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
import { ForYou } from "./ForYou";
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
import { useClock, useRefreshEpisodes } from "../../core/airing";
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
  useLanguage();
  const pageActive = usePageActive();
  const reducedMotion = useReducedMotion();
  const store = useApp(
    useShallow((state) => ({
      data: state.data,
      saving: state.saving,
      prefs: state.prefs,
      mutate: state.mutate,
      add: state.add,
      addMany: state.addMany,
      edit: state.edit,
      remove: state.remove,
      episodes: state.episodes,
      adjustEpisodes: state.adjustEpisodes,
      complete: state.complete,
      rewatch: state.rewatch,
      notify: state.notify,
    })),
  );
  const now = useClock(store.data.preferences.section === "Recommend");
  useRefreshEpisodes(store.data.preferences.section === "Recommend", now);
  const context = useSession((state) => state.recommend);
  const [guided, setGuided] = useState(context?.guided ?? false);
  const [personalized, setPersonalized] = useState(!context);
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
  const [litId, setLitId] = useState<number | null>(null);
  const pendingWinner = useRef<Anime | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const drawController = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const candidatesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!spinning || litId === null) return;
    const container = candidatesRef.current;
    const card = container?.querySelector<HTMLElement>(
      `[data-anime-id="${litId}"]`,
    );
    if (container && card)
      container.scrollTop =
        card.offsetTop - (container.clientHeight - card.offsetHeight) / 2;
  }, [spinning, litId]);
  useEffect(() => {
    if (guided && winner)
      resultRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
  }, [guided, winner, reducedMotion]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setError("");
    setCatalog([]);
    if (
      !pageActive ||
      personalized ||
      store.data.preferences.section !== "Recommend" ||
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
  }, [
    source,
    genre,
    format,
    retry,
    store.data.preferences.adultContent,
    store.data.preferences.section,
    personalized,
    pageActive,
  ]);
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
    setPersonalized(false);
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
  const eligibleIds = useMemo(
    () =>
      new Set(
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
      ),
    [
      store.data.entries,
      genre,
      format,
      minYear,
      maxEpisodes,
      store.data.preferences.adultContent,
    ],
  );
  const tonight = useMemo(
    () =>
      evaluateTonight(
        store.data.entries,
        {
          minutes: budget,
          intent,
          genre,
          adult: store.data.preferences.adultContent,
          eligibleIds,
        },
        now,
      ),
    [
      store.data.entries,
      budget,
      intent,
      genre,
      store.data.preferences.adultContent,
      eligibleIds,
      now,
    ],
  );
  const pool = guided
    ? tonight.candidates.map((c) => c.entry.cachedMetadata)
    : catalogPool;
  useEffect(() => {
    if (pageActive) return;
    generation.current++;
    drawController.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    pendingWinner.current = null;
    setSpinning(false);
    setReel([]);
  }, [pageActive]);
  const revealWinner = () => {
    if (!pendingWinner.current) return;
    if (timer.current) clearTimeout(timer.current);
    setWinner(pendingWinner.current);
    setLitId(pendingWinner.current.anilistId);
    pendingWinner.current = null;
    setReel([]);
    setSpinning(false);
  };
  useEffect(() => {
    if (reducedMotion && pendingWinner.current) {
      if (timer.current) clearTimeout(timer.current);
      setWinner(pendingWinner.current);
      setLitId(pendingWinner.current.anilistId);
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
    setLitId(null);
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
    personalized,
    store.data.preferences.section,
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
    if (guided) {
      const target = candidates.findIndex(
        (a) => a.anilistId === chosen.anilistId,
      );
      const steps =
        candidates.length === 1
          ? 0
          : Math.min(18, candidates.length * 4 + target);
      const start =
        (target - (steps % candidates.length) + candidates.length) %
        candidates.length;
      let step = 0;
      const illuminate = () => {
        if (token !== generation.current) return;
        setLitId(candidates[(start + step) % candidates.length].anilistId);
        if (step === steps) {
          timer.current = setTimeout(revealWinner, 500);
          return;
        }
        step++;
        timer.current = setTimeout(illuminate, 90 + 230 * (step / steps) ** 2);
      };
      illuminate();
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
        {" "}
        {t("Choose from")}{" "}
        <select
          disabled={guided}
          value={
            guided ? (intent === "start" ? "Watchlist" : "Library") : source
          }
          onChange={(e) => setSource(e.target.value)}
        >
          {["Watchlist", "Library", "AniList", "Sample catalog"].map((s) => (
            <option key={s} value={s}>
              {s === "AniList" ? t("All anime · AniList") : t(s)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {" "}
        {t("Genre")}{" "}
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">{t("Any genre")}</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {t(g)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {" "}
        {t("Format")}{" "}
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="">{t("Any format")}</option>
          {["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"].map((f) => (
            <option key={f} value={f}>
              {t(f)}
            </option>
          ))}
        </select>
      </label>
      <div className="filter-pair">
        <label className="field">
          {" "}
          {t("Released since")}{" "}
          <input
            type="number"
            min="1900"
            max="2100"
            placeholder={t("Any year")}
            value={minYear}
            onChange={(e) => setMinYear(e.target.value)}
          />
        </label>
        <label className="field">
          {" "}
          {t("Max episodes")}{" "}
          <input
            type="number"
            min="1"
            max="10000"
            placeholder={t("Any length")}
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
        <RotateCcw size={13} /> {t("Reset filters")}{" "}
      </button>
      <p className="muted candidate-count">
        {!guided && source === "AniList"
          ? t("AniList · Online")
          : loading
            ? t("Loading…")
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
            {" "}
            {t("Retry")}{" "}
          </button>
        </div>
      )}
    </aside>
  );
  return (
    <div className={`page recommendation-page ${guided ? "is-guided" : ""}`}>
      <PageTitle title={t("Recommend")} />
      <div
        className="tonight-mode"
        role="group"
        aria-label={t("Recommendation mode")}
      >
        <button
          className="button"
          aria-pressed={personalized}
          onClick={() => setPersonalized(true)}
        >
          {t("For you")}
        </button>
        <button
          className="button"
          aria-pressed={!guided && !personalized}
          onClick={() => {
            setPersonalized(false);
            setGuided(false);
          }}
        >
          {" "}
          {t("Explore & shuffle")}{" "}
        </button>
        <button
          className="button"
          aria-pressed={guided && !personalized}
          onClick={() => {
            setPersonalized(false);
            setGuided(true);
            setSource(intent === "start" ? "Watchlist" : "Library");
          }}
        >
          {" "}
          {t("What fits tonight?")}{" "}
        </button>
      </div>
      {personalized && <ForYou onOpen={onOpen} />}
      {!personalized && guided && (
        <section className="tonight-panel" aria-label={t("Plan tonight")}>
          <div>
            <p className="eyebrow">{t("A little time. A good story.")}</p>
            <h2>{t("What fits tonight?")}</h2>
            <p>
              {t(
                "All the anime in your collection that fit your time tonight.",
              )}
            </p>
          </div>
          <div className="tonight-controls">
            <label className="field">
              {" "}
              {t("I want to")}{" "}
              <select
                value={intent}
                onChange={(e) => {
                  setIntent(e.target.value as "start" | "continue");
                  setSource(
                    e.target.value === "start" ? "Watchlist" : "Library",
                  );
                }}
              >
                <option value="continue">{t("Continue an anime")}</option>
                <option value="start">{t("Start something new")}</option>
              </select>
            </label>
            <label className="field">
              {" "}
              {t("Time available")}{" "}
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              >
                <option value="25">{t("25 minutes")}</option>
                <option value="50">{t("50 minutes")}</option>
                <option value="90">{t("90 minutes")}</option>
                <option value="custom">{t("Custom duration")}</option>
                <option value="any">{t("No time limit")}</option>
              </select>
            </label>
            {minutes === "custom" && (
              <label className="field">
                {" "}
                {t("Minutes")}{" "}
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
            <p role="alert">{t("Enter a duration greater than zero.")}</p>
          )}
          {tonight.unknownDuration > 0 && (
            <p className="muted">
              {tonight.unknownDuration}{" "}
              {t(
                "anime excluded because their duration is unknown. Choose No time limit to include them.",
              )}{" "}
            </p>
          )}
          <div className="tonight-draw-controls">
            <button
              className="button primary"
              onClick={() => void spin()}
              disabled={spinning || !pool.length}
            >
              <Shuffle size={17} />
              {spinning
                ? t("Choosing…")
                : winner
                  ? t("Pick another")
                  : t("Pick an anime")}
            </button>
            {spinning && (
              <>
                <span role="status">{t("Finding tonight’s story…")}</span>
                <button className="button" onClick={revealWinner}>
                  {" "}
                  {t("Skip animation")}{" "}
                </button>
              </>
            )}
          </div>
          <p className="muted">
            {tonight.candidates.length} {t("matching anime")}
          </p>
          <div
            className="tonight-candidates"
            aria-busy={spinning}
            ref={candidatesRef}
            tabIndex={0}
            role="region"
            aria-label={t("Tonight candidates")}
          >
            {tonight.candidates.map((c) => (
              <article
                className={`tonight-candidate ${litId === c.entry.anilistId ? "is-lit" : ""} ${spinning ? "is-selecting" : ""}`}
                key={c.entry.localId}
                data-anime-id={c.entry.anilistId}
              >
                <button
                  className="tonight-cover"
                  onClick={() => onOpen(c.entry.cachedMetadata)}
                  aria-label={t("Open {value0}", {
                    value0: c.entry.preferredTitle,
                  })}
                >
                  <Artwork
                    src={animeCover(c.entry.cachedMetadata, c.entry.coverImage)}
                    title={c.entry.preferredTitle}
                  />
                </button>
                <div>
                  <h3>{c.entry.preferredTitle}</h3>
                  <p>
                    {c.entry.cachedMetadata.duration ?? "?"} {t("min")}{" "}
                    {c.entry.cachedMetadata.format === "MOVIE"
                      ? t(" · Movie")
                      : t(" / episode")}{" "}
                    · {c.entry.watchedEpisodes}/{c.entry.totalEpisodes ?? "?"}{" "}
                    {t("ep")}{" "}
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
                      {t(reason)}
                    </p>
                  ))}
                  <div className="welcome-actions">
                    <button
                      className="button"
                      onClick={() => onOpen(c.entry.cachedMetadata)}
                    >
                      {" "}
                      {t("Open anime")}{" "}
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
                        {" "}
                        {t("Start watching")}{" "}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!tonight.candidates.length && (
            <div className="tonight-empty">
              <h3>{t("No anime fits these filters")}</h3>
              <p>
                {" "}
                {t(
                  "Allow more time or clear your filters to find another story.",
                )}{" "}
              </p>
              <button className="button" onClick={() => setMinutes("any")}>
                {" "}
                {t("No time limit")}{" "}
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
                {" "}
                {t("Clear filters")}{" "}
              </button>
            </div>
          )}
        </section>
      )}
      {(!guided || shown) && (
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
                aria-label={t("Drawing an anime")}
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
                    {" "}
                    {t("Skip animation")}{" "}
                  </button>
                )}
                <p className="roulette-caption">
                  {reel.length
                    ? t("Finding your next watch")
                    : t("Exploring the catalog")}
                </p>
              </div>
            ) : shown ? (
              <div
                data-anime-id={shown.anilistId}
                className={`recommendation-result ${winner ? "is-revealed" : ""}`}
                key={shown.anilistId}
                ref={resultRef}
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
                    {spinning
                      ? t("Choosing…")
                      : (shown.english ?? shown.romaji)}
                  </h2>
                  <p>
                    {shown.year ?? "—"} · {shown.format ?? "Anime"} ·{" "}
                    {shown.episodes ?? "?"} {t("episodes")}{" "}
                  </p>
                  {guided && (
                    <p className="tonight-synopsis">{shown.description}</p>
                  )}
                  {guided &&
                    tonight.candidates
                      .find((c) => c.entry.anilistId === shown.anilistId)
                      ?.reasons.map((reason) => (
                        <p key={reason} className="tonight-reason">
                          {t(reason)}
                        </p>
                      ))}
                  {winner && (
                    <>
                      <div className="genre-chips">
                        {shown.genres.slice(0, 3).map((g) => (
                          <span key={g}>{g}</span>
                        ))}
                      </div>
                      <div className="welcome-actions">
                        <button
                          className="button"
                          onClick={() => onOpen(shown)}
                        >
                          {" "}
                          {t("View anime")} <ArrowUpRight size={14} />
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
                            {" "}
                            {t("Start watching")}{" "}
                          </button>
                        )}
                        <button
                          className="button"
                          disabled={!!existing}
                          onClick={() => void store.add(shown)}
                        >
                          <BookmarkPlus size={15} />
                          {existing
                            ? t("In your library")
                            : t("Add to Watchlist")}
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
                      {" "}
                      {t("What to")} <br />
                      <em>{t("watch?")}</em>
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
                {!pool.length &&
                  (guided || source !== "AniList") &&
                  !loading && (
                    <p>{t("Try different filters or another source.")}</p>
                  )}
              </div>
            )}
            {!personalized && !guided && (
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
                {spinning
                  ? t("Choosing…")
                  : winner
                    ? t("Pick another")
                    : t("Pick an anime")}
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
