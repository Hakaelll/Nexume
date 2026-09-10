import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight, LoaderCircle } from "lucide-react";
import { type Anime } from "../../domain/model";
import { anilist } from "../../services/anilist/provider";
import { useApp } from "../../app/store";
import { Artwork } from "../../components/ui";

export function HeaderSearch({
  query,
  onQuery,
  onOpen,
  onFullSearch,
}: {
  query: string;
  onQuery: (value: string) => void;
  onOpen: (anime: Anime) => void;
  onFullSearch: () => void;
}) {
  const { data } = useApp();
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLFormElement>(null);
  const needle = query.trim().toLowerCase();
  const local = needle
    ? data.entries
        .filter(
          (entry) =>
            (data.preferences.adultContent || !entry.cachedMetadata.isAdult) &&
            [
              entry.preferredTitle,
              entry.cachedMetadata.romaji,
              entry.cachedMetadata.english,
              ...entry.cachedMetadata.synonyms,
            ].some((title) => title?.toLowerCase().includes(needle)),
        )
        .map((entry) => entry.cachedMetadata)
    : [];
  const items = [
    ...local,
    ...results.filter(
      (item) => !local.some((a) => a.anilistId === item.anilistId),
    ),
  ].slice(0, 6);
  const expanded = focused && !!needle;
  useEffect(() => {
    setResults([]);
    setActive(-1);
    setError("");
    setLoading(!!needle && focused);
    if (!needle || !focused) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void anilist
        .search(
          { query: needle, adult: data.preferences.adultContent },
          controller.signal,
        )
        .then((result) => {
          if (!controller.signal.aborted) setResults(result.items);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError("Catalog unavailable. Try again shortly.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needle, focused, data.preferences.adultContent]);
  useEffect(() => {
    root.current
      ?.querySelector(`[data-result-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const open = (anime: Anime) => {
    setFocused(false);
    onQuery("");
    onOpen(anime);
  };
  return (
    <form
      ref={root}
      className="header-search"
      role="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (expanded && items[active]) open(items[active]);
        else {
          setFocused(false);
          onFullSearch();
        }
      }}
    >
      <Search size={15} />
      <input
        aria-label="Search anime catalog"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? "header-results" : undefined}
        aria-activedescendant={
          expanded && items[active]
            ? `header-anime-${items[active].anilistId}`
            : undefined
        }
        placeholder="Search anime…"
        value={query}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          onQuery(event.target.value);
          setFocused(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setFocused(false);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setFocused(true);
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  items.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
        }}
      />
      <button
        type="button"
        aria-label="Open search"
        onClick={() => {
          setFocused(false);
          onFullSearch();
        }}
      >
        <kbd>Ctrl K</kbd>
      </button>
      {expanded && (
        <div className="header-suggestions">
          <div
            id="header-results"
            role="listbox"
            aria-label="Search suggestions"
            aria-busy={loading}
          >
            {items.map((anime, index) => (
              <button
                type="button"
                role="option"
                id={`header-anime-${anime.anilistId}`}
                key={anime.anilistId}
                data-result-index={index}
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => open(anime)}
              >
                <Artwork
                  src={anime.coverImage || anime.coverLarge}
                  title={anime.english || anime.romaji}
                  eager
                />
                <span>
                  <strong>{anime.english || anime.romaji}</strong>
                  <small>
                    {[
                      anime.year,
                      anime.format?.replaceAll("_", " "),
                      anime.genres[0],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          {loading && (
            <p className="suggestion-status" role="status">
              <LoaderCircle size={13} className="search-spinner" />
              Searching…
            </p>
          )}
          {!loading && error && (
            <p className="suggestion-status" role="status">
              {error}
            </p>
          )}
          {!loading && !error && !items.length && (
            <p className="suggestion-status" role="status">
              No anime found.
            </p>
          )}
          <button
            type="button"
            className="suggestion-more"
            onClick={() => {
              setFocused(false);
              onFullSearch();
            }}
          >
            View all results <ArrowUpRight size={13} />
          </button>
        </div>
      )}
    </form>
  );
}
