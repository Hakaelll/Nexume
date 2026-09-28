import { animeCover } from "../../domain/artwork";
import {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
  memo,
} from "react";
import {
  LayoutGrid,
  List,
  Orbit,
  SlidersHorizontal,
  Search,
  ArrowDown,
  ArrowUp,
  Plus,
} from "lucide-react";
import { useApp } from "../../app/store";
import { watchNearViewport } from "../../core/viewport";
import { filterEntries } from "../../domain/rules";
import { statuses, type Entry } from "../../domain/model";
import {
  AnimeCard,
  Artwork,
  Empty,
  PageTitle,
  SelectField,
  Stars,
  SampleCovers,
} from "../../components/ui";
const Collection = lazy(() => import("./Collection"));
const LibraryCard = memo(function LibraryCard({
  entry,
  onOpen,
  onContext,
}: {
  entry: Entry;
  onOpen: Props["onOpen"];
  onContext: Props["onContext"];
}) {
  const host = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [near, setNear] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focused, setFocused] = useState(false);
  const loaded = near || pinned || focused;
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
      className="library-card-slot"
      onFocusCapture={() => {
        if (loaded) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {loaded ? (
        <AnimeCard
          entry={entry}
          onOpen={() => onOpen(entry)}
          onContext={(event) => onContext(event, entry)}
          onInteractionChange={setPinned}
        />
      ) : (
        <article
          className="anime-card"
          data-anime-id={entry.anilistId}
          onContextMenu={(event) => onContext(event, entry)}
        >
          <button
            className="cover-button"
            onClick={() => onOpen(entry)}
            aria-label={`Open ${title}`}
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
            <button onClick={() => onOpen(entry)}>{title}</button>
            <span>{entry.cachedMetadata.year ?? "TBA"}</span>
          </div>
          <div className="card-meta">
            <span className="library-rating-placeholder" aria-hidden="true" />
            <span>
              {entry.watchedEpisodes}/{entry.totalEpisodes ?? "?"} ep
            </span>
          </div>
        </article>
      )}
    </div>
  );
});
interface Props {
  onOpen: (e: Entry) => void;
  onSearch: () => void;
  onSample: () => void;
  onContext: (
    e: Pick<MouseEvent, "clientX" | "clientY" | "preventDefault">,
    entry: Entry,
  ) => void;
  onQuick: (e: Entry) => void;
}
export default function Library({
  onOpen,
  onSearch,
  onSample,
  onContext,
  onQuick,
}: Props) {
  const data = useApp((state) => state.data);
  const prefs = useApp((state) => state.prefs);
  const p = data.preferences;
  const libraryEntries = data.entries;
  const {
    search,
    filter,
    year,
    genre,
    format,
    studio,
    season,
    tag,
    minRating,
    sort: sortBy,
    descending,
  } = p;
  const entries = useMemo(
    () =>
      filterEntries({
        entries: libraryEntries,
        preferences: {
          search,
          filter,
          year,
          genre,
          format,
          studio,
          season,
          tag,
          minRating,
          sort: sortBy,
          descending,
        },
      }),
    [
      libraryEntries,
      search,
      filter,
      year,
      genre,
      format,
      studio,
      season,
      tag,
      minRating,
      sortBy,
      descending,
    ],
  );
  const [filters, setFilters] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = p.scrollTop;
  }, [p.view]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = (get: (e: Entry) => string[]) =>
    [...new Set(data.entries.flatMap(get))].sort();
  const sort = (key: string) =>
    void prefs({
      sort: key,
      descending: p.sort === key ? !p.descending : key !== "title",
    });
  return (
    <div
      className={`library-page ${p.view === "Collection" ? "immersive" : ""}`}
    >
      <PageTitle title="Library" subtitle={`${data.entries.length} anime`}>
        <button className="button" onClick={onSearch}>
          <Plus size={15} /> Add anime
        </button>
      </PageTitle>
      <div className="library-toolbar">
        <div className="status-tabs" aria-label="Library status">
          {["All", ...statuses, "Favorites"].map((s) => (
            <button
              key={s}
              className={p.filter === s ? "active" : ""}
              onClick={() => void prefs({ filter: s, selectedId: "" })}
            >
              {s}
              {s === "All" && <small>{data.entries.length}</small>}
            </button>
          ))}
        </div>
        <div className="view-switch" aria-label="Library view">
          {(
            [
              ["Collection", Orbit],
              ["Grid", LayoutGrid],
              ["List", List],
            ] as const
          ).map(([name, Icon]) => (
            <button
              key={name}
              aria-pressed={p.view === name}
              className={p.view === name ? "active" : ""}
              onClick={() => void prefs({ view: name })}
            >
              <Icon size={14} />
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-bar">
        <label className="library-search">
          <Search size={15} />
          <input
            aria-label="Search your library"
            placeholder="Find in your collection"
            value={p.search}
            onChange={(e) => void prefs({ search: e.target.value })}
          />
        </label>
        <div className="filter-actions">
          <button
            className="text-button"
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
          <select
            aria-label="Sort library"
            value={p.sort}
            onChange={(e) => void prefs({ sort: e.target.value })}
          >
            <option value="added">Date added</option>
            <option value="title">Title</option>
            <option value="rating">Your rating</option>
            <option value="year">Release year</option>
            <option value="watched">Last watched</option>
          </select>
          <button
            className="icon-button"
            aria-label="Reverse sort order"
            onClick={() => void prefs({ descending: !p.descending })}
          >
            {p.descending ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
          </button>
        </div>
      </div>
      {filters && (
        <div className="filters">
          <SelectField
            label="Year"
            value={p.year}
            onChange={(year) => void prefs({ year })}
            options={options((e) =>
              e.cachedMetadata.year ? [String(e.cachedMetadata.year)] : [],
            )}
          />
          <SelectField
            label="Genre"
            value={p.genre}
            onChange={(genre) => void prefs({ genre })}
            options={options((e) => e.cachedMetadata.genres)}
          />
          <SelectField
            label="Format"
            value={p.format}
            onChange={(format) => void prefs({ format })}
            options={options((e) =>
              e.cachedMetadata.format ? [e.cachedMetadata.format] : [],
            )}
          />
          <SelectField
            label="Studio"
            value={p.studio}
            onChange={(studio) => void prefs({ studio })}
            options={options((e) => e.cachedMetadata.studios)}
          />
          <SelectField
            label="Season"
            value={p.season}
            onChange={(season) => void prefs({ season })}
            options={["WINTER", "SPRING", "SUMMER", "FALL"]}
          />
          <SelectField
            label="Personal tag"
            value={p.tag}
            onChange={(tag) => void prefs({ tag })}
            options={options((e) => e.personalTags)}
          />
          <label className="select-field">
            <span>Minimum stars</span>
            <select
              value={p.minRating}
              onChange={(e) =>
                void prefs({ minRating: Number(e.target.value) })
              }
            >
              <option value="0">Any</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n / 2}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() =>
              void prefs({
                year: "",
                genre: "",
                format: "",
                studio: "",
                season: "",
                tag: "",
                minRating: 0,
                search: "",
                filter: "All",
              })
            }
          >
            Reset
          </button>
          {p.view === "Grid" && (
            <label className="select-field">
              Cover size
              <input
                aria-label="Cover size"
                type="range"
                min="130"
                max="260"
                value={p.gridSize}
                onChange={(e) =>
                  void prefs({ gridSize: Number(e.target.value) })
                }
              />
            </label>
          )}
          {p.view === "List" && (
            <fieldset className="column-settings">
              <legend>Columns</legend>
              {[
                "status",
                "episodes",
                "rating",
                "community",
                "year",
                "watched",
              ].map((c) => (
                <label key={c}>
                  <input
                    type="checkbox"
                    checked={p.columns.includes(c)}
                    onChange={() =>
                      void prefs({
                        columns: p.columns.includes(c)
                          ? p.columns.filter((v) => v !== c)
                          : [...p.columns, c],
                      })
                    }
                  />
                  {c}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      )}
      {!entries.length ? (
        <div className="empty-library">
          {!data.entries.length && <SampleCovers />}
          <Empty
            title={
              data.entries.length ? "No titles match." : "Your library is empty"
            }
            text={
              data.entries.length
                ? "Try another search or adjust your filters."
                : "Add anime or try the sample collection."
            }
            action="Search anime"
            onAction={onSearch}
          />
          {!data.entries.length && (
            <button className="text-button" onClick={onSample}>
              Try a sample
            </button>
          )}
        </div>
      ) : p.view === "Collection" ? (
        <Suspense
          fallback={
            <div className="scene-loading">Preparing your collection…</div>
          }
        >
          <Collection
            entries={entries}
            onOpen={onOpen}
            onQuick={onQuick}
            onContext={onContext}
          />
        </Suspense>
      ) : (
        <div
          ref={ref}
          className="library-results"
          onScroll={(e) => {
            const node = e.currentTarget;
            clearTimeout(scrollTimer.current);
            scrollTimer.current = setTimeout(
              () => void prefs({ scrollTop: node.scrollTop }),
              250,
            );
          }}
        >
          {p.view === "Grid" ? (
            <div
              className="poster-grid"
              style={{
                gridTemplateColumns: `repeat(auto-fill,minmax(${p.gridSize}px,1fr))`,
              }}
            >
              {entries.map((entry) => (
                <LibraryCard
                  key={entry.localId}
                  entry={entry}
                  onOpen={onOpen}
                  onContext={onContext}
                />
              ))}
            </div>
          ) : (
            <table className="library-table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => sort("title")}>Title</button>
                  </th>
                  {p.columns.map((c) => (
                    <th key={c}>
                      <button onClick={() => sort(c)}>
                        {
                          (
                            {
                              status: "Status",
                              episodes: "Episodes",
                              rating: "Your rating",
                              community: "AniList",
                              year: "Year",
                              watched: "Last watched",
                            } as Record<string, string>
                          )[c]
                        }
                        {p.sort === c ? (p.descending ? " ↓" : " ↑") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.localId}
                    onDoubleClick={() => onOpen(entry)}
                    onContextMenu={(e) => onContext(e, entry)}
                  >
                    <td>
                      <button
                        className="table-title"
                        onClick={() => onOpen(entry)}
                      >
                        <Artwork
                          src={animeCover(
                            entry.cachedMetadata,
                            entry.coverImage,
                          )}
                          title={entry.preferredTitle}
                        />
                        <span>{entry.preferredTitle}</span>
                      </button>
                    </td>
                    {p.columns.map((c) => (
                      <td key={c}>
                        {c === "rating" ? (
                          <Stars
                            value={entry.personalRating}
                            onChange={(v) =>
                              void useApp
                                .getState()
                                .edit(entry.localId, { personalRating: v })
                            }
                          />
                        ) : c === "status" ? (
                          entry.personalStatus
                        ) : c === "episodes" ? (
                          `${entry.watchedEpisodes} / ${entry.totalEpisodes ?? "?"}`
                        ) : c === "community" ? (
                          (entry.cachedMetadata.averageScore ?? "—")
                        ) : c === "year" ? (
                          (entry.cachedMetadata.year ?? "—")
                        ) : (
                          (entry.lastWatchedDate?.slice(0, 10) ?? "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <div className="library-footer">
        <span>{entries.length} TITLES IN VIEW</span>
      </div>
    </div>
  );
}
