import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useApp } from "../../app/store";
import { type Entry } from "../../domain/model";
import { Artwork, PageTitle } from "../../components/ui";
import { animeCover } from "../../domain/artwork";
import { calendarDays, useAiring, useClock } from "../../core/airing";
export default function Calendar({
  onOpen,
}: {
  onOpen: (entry: Entry) => void;
}) {
  const { data } = useApp();
  const now = useClock(data.preferences.section === "Calendar"),
    today = new Date(now);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const days = calendarDays(cursor, mode),
    last = days[days.length - 1];
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  const { items, loading, error } = useAiring(
    days[0],
    end,
    true,
    data.preferences.section === "Calendar",
  );
  const shift = (amount: number) =>
    setCursor((d) =>
      mode === "month"
        ? new Date(d.getFullYear(), d.getMonth() + amount, 1)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount * 7),
    );
  return (
    <div className="page calendar-page">
      <PageTitle
        title="Calendar"
        subtitle="Your upcoming episodes · local time"
      />
      <div className="calendar-toolbar">
        <div className="calendar-period">
          <CalendarDays size={20} />
          <h2>
            {cursor.toLocaleDateString("en", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <span>{items.length} episodes</span>
        </div>
        <div className="calendar-controls">
          <button
            className="button"
            aria-label={`Previous ${mode}`}
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button className="button" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button
            className="button"
            aria-label={`Next ${mode}`}
            onClick={() => shift(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="view-switch" aria-label="Calendar view">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              className={mode === v ? "active" : ""}
              aria-pressed={mode === v}
              onClick={() => setMode(v)}
            >
              {v === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="muted" role="status">
          {error}
        </p>
      )}
      {loading && (
        <p className="muted" role="status">
          Updating schedule…
        </p>
      )}
      <div className={`calendar-grid ${mode}-view`}>
        {days.map((day) => {
          const events = items.filter(
            (a) =>
              new Date(a.nextAiringEpisode!.airingAt * 1000).toDateString() ===
              day.toDateString(),
          );
          const isToday = day.toDateString() === today.toDateString();
          return (
            <section
              className={`calendar-day ${isToday ? "today" : ""} ${day.getMonth() !== cursor.getMonth() ? "outside-month" : ""}`}
              key={day.toISOString()}
              aria-label={day.toDateString()}
            >
              <header>
                <span>
                  {day.toLocaleDateString("en", { weekday: "short" })}
                </span>
                <strong aria-current={isToday ? "date" : undefined}>
                  {day.getDate()}
                </strong>
                {events.length > 0 && <small>{events.length} ep.</small>}
              </header>
              {events.length ? (
                events.map((anime) => {
                  const air = anime.nextAiringEpisode!;
                  const entry = data.entries.find(
                    (e) => e.anilistId === anime.anilistId,
                  );
                  return (
                    <button
                      className="calendar-episode"
                      key={`${anime.anilistId}-${air.episode}`}
                      onClick={() => entry && onOpen(entry)}
                    >
                      <Artwork
                        src={animeCover(anime)}
                        title={anime.english ?? anime.romaji}
                      />
                      <span>
                        <strong>
                          {entry?.preferredTitle ??
                            anime.english ??
                            anime.romaji}
                        </strong>
                        <small>
                          EP {air.episode} ·{" "}
                          {new Date(air.airingAt * 1000).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </small>
                        <em>
                          {air.airingAt * 1000 < now ? "Aired" : "Upcoming"}
                        </em>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="calendar-free">No episodes</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="calendar-note muted">
        Schedules for your Watching, Rewatching and Watchlist anime. Dates may
        change.
      </p>
    </div>
  );
}
