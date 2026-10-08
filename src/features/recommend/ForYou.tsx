import { usePageActive } from "../../core/activity";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Anime } from "../../domain/model";
import { personalize } from "../../domain/personalized";
import { anilist, seasonNow } from "../../services/anilist/provider";
import { useApp } from "../../app/store";
import { AnimeCard, Empty } from "../../components/ui";
import { t, useLanguage } from "../../core/i18n";

export function ForYou({ onOpen }: { onOpen: (anime: Anime) => void }) {
  useLanguage();
  const pageActive = usePageActive();
  const { entries, profile, preferences, prefs } = useApp(
    useShallow((s) => ({
      entries: s.data.entries,
      profile: s.data.profile,
      preferences: s.data.preferences,
      prefs: s.prefs,
    })),
  );
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!pageActive || preferences.section !== "Recommend") return;
    const controller = new AbortController();
    const local = entries.map((e) => e.cachedMetadata);
    // Saved metadata is used for affinity; online results supply new candidates.
    if (!navigator.onLine) {
      setLoading(false);
      setError("You're offline.");
      return;
    }
    setLoading(true);
    setError("");
    anilist
      .search(
        { ...seasonNow(), adult: preferences.adultContent },
        controller.signal,
      )
      .then((page) => {
        if (!controller.signal.aborted) setItems(page.items);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setItems((old) => (old.length ? old : local));
          setError(
            e instanceof Error
              ? e.message
              : "Catalog unavailable. Try again shortly.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // Library edits rerank candidates without starting a new remote request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.adultContent, preferences.section, retry, pageActive]);
  const picks = useMemo(
    () =>
      personalize(
        items,
        entries,
        profile.favoriteIds,
        preferences.hiddenRecommendations,
        preferences.adultContent,
      ),
    [
      items,
      entries,
      profile.favoriteIds,
      preferences.hiddenRecommendations,
      preferences.adultContent,
    ],
  );
  return (
    <section className="for-you" aria-label={t("For you")}>
      {loading && <p role="status">{t("Loading…")}</p>}
      {error && (
        <div className="error-inline" role="alert">
          {t(error)}{" "}
          <button
            className="text-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            {t("Retry")}
          </button>
        </div>
      )}
      {!loading && !picks.length && (
        <Empty
          title={t("No new recommendations")}
          text={t("Add more favorites or try Discover.")}
        />
      )}
      <div className="poster-grid">
        {picks.slice(0, 12).map((pick) => (
          <div className="personal-pick" key={pick.anime.anilistId}>
            <AnimeCard anime={pick.anime} onOpen={() => onOpen(pick.anime)} />
            <p className="pick-reason">
              {pick.personalized ? (
                <>
                  {pick.genres.length > 0 && (
                    <span>
                      {t("Genres")}: {pick.genres.map((g) => t(g)).join(", ")}
                    </span>
                  )}
                  {pick.studios.length > 0 && (
                    <span>
                      {t("Studio")}: {pick.studios.join(", ")}
                    </span>
                  )}
                </>
              ) : (
                t("General picks")
              )}
            </p>
            <button
              className="text-button"
              onClick={() =>
                void prefs({
                  hiddenRecommendations: [
                    ...new Set([
                      ...useApp.getState().data.preferences
                        .hiddenRecommendations,
                      pick.anime.anilistId,
                    ]),
                  ],
                })
              }
            >
              {t("Hide recommendation")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
