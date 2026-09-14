import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, Plus, Check, ArrowRight } from "lucide-react";
import {
  anilist,
  type SearchOptions,
  seasonNow,
} from "../../services/anilist/provider";
import { type Anime } from "../../domain/model";
import { useApp } from "../../app/store";
import {
  AnimeCard,
  Artwork,
  Empty,
  Modal,
  PageTitle,
  SelectField,
} from "../../components/ui";
export function SearchDialog({
  onClose,
  onOpen,
  initialQuery = "",
}: {
  onClose: () => void;
  onOpen: (a: Anime) => void;
  initialQuery?: string;
}) {
  const store = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Anime[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      setLoading(false);
      setMore(false);
      setError("");
      return;
    }
    const c = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      anilist
        .search(
          { query, page, adult: store.data.preferences.adultContent },
          c.signal,
        )
        .then((result) => {
          if (c.signal.aborted) return;
          setItems((old) =>
            page === 1
              ? result.items
              : [
                  ...old,
                  ...result.items.filter(
                    (i) => !old.some((a) => a.anilistId === i.anilistId),
                  ),
                ],
          );
          setMore(result.hasNextPage);
          setActive(0);
        })
        .catch((e) => {
          if (!c.signal.aborted)
            setError(e instanceof Error ? e.message : "Search failed.");
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query, page, retry, store.data.preferences.adultContent]);
  const open = (a: Anime) => {
    void store.mutate((d) => ({
      ...d,
      searchHistory: [
        query,
        ...d.searchHistory.filter((q) => q !== query),
      ].slice(0, 20),
    }));
    onOpen(a);
    onClose();
  };
  return (
    <Modal title="Search anime" onClose={onClose} wide>
      <div className="global-search">
        <SearchIcon size={20} />
        <input
          ref={input}
          role="combobox"
          aria-label="Search AniList"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={items.length > 0}
          aria-activedescendant={
            items[active] ? `search-${items[active].anilistId}` : undefined
          }
          placeholder="Search anime, in any language…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
            setItems([]);
            setLoading(!!e.target.value.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) =>
                Math.max(
                  0,
                  Math.min(
                    items.length - 1,
                    a + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter" && items[active]) open(items[active]);
          }}
        />
        <kbd>ESC</kbd>
      </div>
      {!navigator.onLine ? (
        <Empty
          title="You're offline."
          text="Your library is still here. Online search will return when you reconnect."
        />
      ) : !query ? (
        <div className="search-intro">
          <p className="prose">Search by anime title.</p>
          {store.data.searchHistory.length > 0 && (
            <>
              <p className="eyebrow">RECENT SEARCHES</p>
              <div className="recent-searches">
                {store.data.searchHistory.map((q) => (
                  <button
                    key={q}
                    className="button"
                    onClick={() => setQuery(q)}
                  >
                    {q}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div
            className="search-results"
            id="search-results"
            role="listbox"
            aria-label="Anime results"
          >
            {items.map((a, i) => {
              const added = store.data.entries.some(
                (e) => e.anilistId === a.anilistId,
              );
              return (
                <div
                  id={`search-${a.anilistId}`}
                  role="option"
                  aria-selected={active === i}
                  className={`search-result ${active === i ? "active" : ""}`}
                  key={a.anilistId}
                >
                  <button
                    className="search-open"
                    onClick={() => open(a)}
                    onFocus={() => setActive(i)}
                  >
                    <Artwork
                      src={a.coverLarge || a.coverImage}
                      title={a.english ?? a.romaji}
                    />
                    <span>
                      <strong>{a.english ?? a.romaji}</strong>
                      <small>
                        {a.year ?? "TBA"} · {a.format ?? "Anime"} ·{" "}
                        {a.episodes ?? "?"} episodes · AniList{" "}
                        {a.averageScore ?? "—"}
                      </small>
                    </span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={
                      added
                        ? `${a.english ?? a.romaji} is in your library`
                        : `Add ${a.english ?? a.romaji} to Watchlist`
                    }
                    disabled={added}
                    onClick={() => void store.add(a)}
                  >
                    {added ? <Check size={17} /> : <Plus size={17} />}
                  </button>
                </div>
              );
            })}
          </div>
          {loading && (
            <div className="search-skeleton" role="status">
              Searching AniList…
            </div>
          )}
          {error && (
            <div role="alert" className="error-inline">
              {error}
              <button onClick={() => setRetry((v) => v + 1)}>Retry</button>
            </div>
          )}
          {!loading && !error && !items.length && (
            <Empty
              title="No titles found."
              text="Try the original title or a different spelling."
            />
          )}
          {more && !loading && (
            <button
              className="button full"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
export function Discover({ onOpen }: { onOpen: (a: Anime) => void }) {
  const { data, add } = useApp();
  const [category, setCategory] = useState("Trending");
  const [options, setOptions] = useState<SearchOptions>({});
  const [items, setItems] = useState<Anime[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [addingSeason, setAddingSeason] = useState(false);
  const [seasonMessage, setSeasonMessage] = useState("");
  const seasonController = useRef<AbortController | null>(null);
  useEffect(() => () => seasonController.current?.abort(), []);
  const addSeason = async () => {
    if (seasonController.current) return;
    const controller = new AbortController();
    seasonController.current = controller;
    const selectedSeason = seasonNow(category === "Next season" ? 1 : 0);
    setAddingSeason(true);
    setSeasonMessage("Fetching the complete season…");
    try {
      const all: Anime[] = [];
      for (let page = 1; ; page++) {
        const result = await anilist.search(
          { ...selectedSeason, adult: data.preferences.adultContent, page },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        all.push(...result.items);
        setSeasonMessage(
          `Fetching the complete season · ${all.length} titles found…`,
        );
        if (!result.hasNextPage) break;
      }
      await useApp.getState().addMany(all);
      if (controller.signal.aborted) return;
      if (useApp.getState().error) throw new Error(useApp.getState().error);
      setSeasonMessage(
        `${selectedSeason.season} ${selectedSeason.year} added to your Watchlist. Existing entries kept. Announced episodes appear in Calendar.`,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setSeasonMessage(
          error instanceof Error
            ? error.message
            : "Could not add this season. Please retry.",
        );
    } finally {
      seasonController.current = null;
      if (!controller.signal.aborted) setAddingSeason(false);
    }
  };
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    const season =
      category === "This season"
        ? seasonNow()
        : category === "Next season"
          ? seasonNow(1)
          : {};
    anilist
      .search(
        {
          ...season,
          ...options,
          page,
          sort:
            options.sort ||
            (options.query
              ? "SEARCH_MATCH"
              : category === "Highest rated"
                ? "SCORE_DESC"
                : category === "Popular"
                  ? "POPULARITY_DESC"
                  : "TRENDING_DESC"),
          adult: data.preferences.adultContent,
        },
        c.signal,
      )
      .then((r) => {
        if (c.signal.aborted) return;
        setItems((old) =>
          page === 1
            ? r.items
            : [
                ...old,
                ...r.items.filter(
                  (i) => !old.some((a) => a.anilistId === i.anilistId),
                ),
              ],
        );
        setMore(r.hasNextPage);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [category, options, page, data.preferences.adultContent, retry]);
  const change = (v: SearchOptions) => {
    setItems([]);
    setPage(1);
    setOptions((o) => ({ ...o, ...v }));
  };
  return (
    <div className="page discover-page">
      <PageTitle title="Discover" />
      {(category === "This season" || category === "Next season") && (
        <div className="season-bulk-actions">
          <button
            className="button primary"
            disabled={addingSeason || !navigator.onLine}
            onClick={() => void addSeason()}
          >
            <Plus size={16} />
            {addingSeason
              ? "Adding season…"
              : `Add all ${category === "This season" ? "current" : "next"} season anime to Watchlist`}
          </button>
          <p className="muted">
            Includes the complete season, regardless of the filters below.
            Scheduled episodes will appear in Calendar.
          </p>
        </div>
      )}
      {seasonMessage && <p role="status">{seasonMessage}</p>}
      <div className="discover-tabs">
        {[
          "Trending",
          "Popular",
          "Highest rated",
          "This season",
          "Next season",
        ].map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="filters">
        <SelectField
          label="Year"
          value={String(options.year ?? "")}
          onChange={(v) => change({ year: Number(v) || undefined })}
          options={Array.from({ length: 70 }, (_, i) =>
            String(new Date().getFullYear() + 1 - i),
          )}
        />
        <SelectField
          label="Season"
          value={options.season ?? ""}
          onChange={(v) => change({ season: v })}
          options={["WINTER", "SPRING", "SUMMER", "FALL"]}
        />
        <SelectField
          label="Genre"
          value={options.genre ?? ""}
          onChange={(v) => change({ genre: v })}
          options={[
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
          ]}
        />
        <SelectField
          label="Format"
          value={options.format ?? ""}
          onChange={(v) => change({ format: v })}
          options={[
            "TV",
            "TV_SHORT",
            "MOVIE",
            "SPECIAL",
            "OVA",
            "ONA",
            "MUSIC",
          ]}
        />
        <SelectField
          label="Status"
          value={options.status ?? ""}
          onChange={(v) => change({ status: v })}
          options={[
            "FINISHED",
            "RELEASING",
            "NOT_YET_RELEASED",
            "CANCELLED",
            "HIATUS",
          ]}
        />
      </div>
      <div className="filters discover-extra-filters">
        <label className="field">
          Title
          <input
            type="search"
            placeholder="Find a title"
            value={options.query ?? ""}
            onChange={(e) => change({ query: e.target.value })}
          />
        </label>
        <SelectField
          label="Minimum score"
          value={String(options.minScore ?? "")}
          onChange={(v) => change({ minScore: Number(v) || undefined })}
          options={["50", "60", "70", "80", "90"]}
        />
        <SelectField
          label="Maximum episodes"
          value={String(options.maxEpisodes ?? "")}
          onChange={(v) => change({ maxEpisodes: Number(v) || undefined })}
          options={["12", "24", "26", "52", "100"]}
        />
        <label className="field">
          Sort by
          <select
            value={options.sort ?? ""}
            onChange={(e) => change({ sort: e.target.value })}
          >
            <option value="">Category default</option>
            <option value="POPULARITY_DESC">Popularity</option>
            <option value="SCORE_DESC">Community score</option>
            <option value="START_DATE_DESC">Newest releases</option>
            <option value="TRENDING_DESC">Trending</option>
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => {
            setOptions({});
            setPage(1);
            setItems([]);
          }}
        >
          Reset filters
        </button>
      </div>
      {!navigator.onLine ? (
        <Empty
          title="You’re offline"
          text="Reconnect to explore AniList. Your library remains available."
        />
      ) : (
        <>
          {error && (
            <div className="error-inline" role="alert">
              {error}
              <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
            </div>
          )}
          <div className="poster-grid">
            {items.map((a) => (
              <div key={a.anilistId}>
                <AnimeCard anime={a} onOpen={() => onOpen(a)} />
                <button
                  className="text-button add-discovery"
                  disabled={data.entries.some(
                    (e) => e.anilistId === a.anilistId,
                  )}
                  onClick={() => void add(a)}
                >
                  {data.entries.some((e) => e.anilistId === a.anilistId) ? (
                    <>
                      <Check size={13} />
                      In your library
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      Add to Watchlist
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          {loading && (
            <div
              className="poster-grid skeleton-grid"
              role="status"
              aria-label="Loading anime"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} />
              ))}
            </div>
          )}
          {!loading && !error && !items.length && (
            <Empty
              title="No anime found."
              text="Try a different combination of filters."
            />
          )}
          {more && !loading && (
            <button
              className="button load-more"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more anime
            </button>
          )}
        </>
      )}
    </div>
  );
}
