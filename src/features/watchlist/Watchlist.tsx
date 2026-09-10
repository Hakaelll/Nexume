import { useMemo, useState } from "react";
import { BookmarkPlus, Play, Shuffle, Search } from "lucide-react";
import { useApp } from "../../app/store";
import { AnimeCard, Empty, PageTitle } from "../../components/ui";
import type { Entry } from "../../domain/model";
export default function Watchlist({
  onOpen,
  onSearch,
}: {
  onOpen: (e: Entry) => void;
  onSearch: () => void;
}) {
  const store = useApp();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("added");
  const planned = store.data.entries.filter(
    (e) => e.personalStatus === "Planning",
  );
  const genres = [
    ...new Set(planned.flatMap((e) => e.cachedMetadata.genres)),
  ].sort();
  const entries = useMemo(
    () =>
      store.data.entries
        .filter(
          (e) =>
            e.personalStatus === "Planning" &&
            e.preferredTitle.toLowerCase().includes(query.toLowerCase()) &&
            (!genre || e.cachedMetadata.genres.includes(genre)),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.preferredTitle.localeCompare(b.preferredTitle)
            : sort === "priority"
              ? b.priority - a.priority
              : b.addedDate.localeCompare(a.addedDate),
        ),
    [store.data.entries, query, genre, sort],
  );
  return (
    <div className="page watchlist-page">
      <PageTitle
        title="Watchlist"
        subtitle={`${planned.length} anime to watch`}
      >
        <button className="button primary" onClick={onSearch}>
          <BookmarkPlus size={16} />
          Add anime
        </button>
      </PageTitle>
      <div className="watchlist-toolbar">
        <label className="library-search">
          <Search size={15} />
          <input
            aria-label="Search Watchlist"
            placeholder="Find an anime"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Watchlist genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="Sort Watchlist"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="added">Recently added</option>
          <option value="title">Title</option>
          <option value="priority">Priority</option>
        </select>
        <button
          className="text-button"
          onClick={() => void store.prefs({ section: "Recommend" })}
        >
          <Shuffle size={15} />
          Pick for me
        </button>
      </div>
      {entries.length ? (
        <div className="poster-grid watchlist-grid">
          {entries.map((e) => (
            <div key={e.localId}>
              <AnimeCard entry={e} onOpen={() => onOpen(e)} />
              <div className="watchlist-actions">
                <button
                  className="button"
                  onClick={() =>
                    void store.edit(e.localId, { personalStatus: "Watching" })
                  }
                >
                  <Play size={13} />
                  Start watching
                </button>
                <select
                  aria-label={`Priority for ${e.preferredTitle}`}
                  value={e.priority}
                  onChange={(event) =>
                    void store.edit(e.localId, {
                      priority: Number(event.target.value) as Entry["priority"],
                    })
                  }
                >
                  <option value="0">Normal</option>
                  <option value="1">Soon</option>
                  <option value="2">Next up</option>
                  <option value="3">Top priority</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={planned.length ? "No matches" : "Your Watchlist is empty"}
          text={
            planned.length
              ? "Try another filter."
              : "Save anime here to watch later."
          }
          action="Add anime"
          onAction={onSearch}
        />
      )}
    </div>
  );
}
