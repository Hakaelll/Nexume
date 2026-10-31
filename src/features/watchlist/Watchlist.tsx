import { t, useLanguage } from "../../core/i18n";
import { openRecommend } from "../../app/session";
import { useMemo, useState } from "react";
import { BookmarkPlus, Shuffle, Search } from "lucide-react";
import { DeferredAnimeCard } from "../../components/DeferredAnimeCard";
import { useApp } from "../../app/store";
import { Empty, PageTitle } from "../../components/ui";
import type { Entry } from "../../domain/model";
export default function Watchlist({
  onOpen,
  onSearch,
}: {
  onOpen: (e: Entry) => void;
  onSearch: () => void;
}) {
  useLanguage();
  const libraryEntries = useApp((state) => state.data.entries);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("added");
  const planned = useMemo(
    () => libraryEntries.filter((e) => e.personalStatus === "Planning"),
    [libraryEntries],
  );
  const genres = useMemo(
    () => [...new Set(planned.flatMap((e) => e.cachedMetadata.genres))].sort(),
    [planned],
  );
  const entries = useMemo(
    () =>
      libraryEntries
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
    [libraryEntries, query, genre, sort],
  );
  return (
    <div className="page watchlist-page">
      <PageTitle
        title={t("Watchlist")}
        subtitle={t("{value0} anime to watch", { value0: planned.length })}
      >
        <button className="button primary" onClick={onSearch}>
          <BookmarkPlus size={16} /> {t("Add anime")}{" "}
        </button>
      </PageTitle>
      <div className="watchlist-toolbar">
        <label className="library-search">
          <Search size={15} />
          <input
            aria-label={t("Search Watchlist")}
            placeholder={t("Find an anime")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label={t("Watchlist genre")}
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">{t("All genres")}</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {t(g)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("Sort Watchlist")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="added">{t("Recently added")}</option>
          <option value="title">{t("Title")}</option>
          <option value="priority">{t("Priority")}</option>
        </select>
        <button
          className="text-button"
          onClick={() =>
            openRecommend({
              source: "Watchlist",
              genre,
              guided: true,
              intent: "start",
            })
          }
        >
          <Shuffle size={15} /> {t("Pick for me")}{" "}
        </button>
      </div>
      {entries.length ? (
        <div className="poster-grid watchlist-grid">
          {entries.map((e) => (
            <DeferredAnimeCard
              key={e.localId}
              entry={e}
              variant="watchlist"
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={
            planned.length ? t("No matches") : t("Your Watchlist is empty")
          }
          text={
            planned.length
              ? "Try another filter."
              : "Save anime here to watch later."
          }
          action={t("Add anime")}
          onAction={onSearch}
        />
      )}
    </div>
  );
}
