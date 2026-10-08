import { t, useLanguage, resolveLanguage } from "../../core/i18n";
import { useState, useMemo, memo } from "react";
import { Clock3, Clapperboard, Star, CheckCircle2 } from "lucide-react";
import { useApp } from "../../app/store";
import { PageTitle } from "../../components/ui";
import { statistics } from "../../domain/rules";
import { statuses } from "../../domain/model";
const colors = [
  "#b84d87",
  "#537cbd",
  "#418677",
  "#c39135",
  "#c16d58",
  "#8870af",
];
function HorizontalChart({
  title,
  items,
}: {
  title: string;
  items: [string, number][];
}) {
  useLanguage();
  const maximum = Math.max(1, ...items.map((i) => i[1]));
  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      {items.length ? (
        <div className="horizontal-chart">
          {items.slice(0, 6).map(([label, value], i) => (
            <div key={label}>
              <span>{label}</span>
              <div>
                <i
                  style={{
                    width: `${(value / maximum) * 100}%`,
                    background: colors[i % colors.length],
                  }}
                />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="chart-empty">{t("No data yet")}</p>
      )}
    </section>
  );
}
export default memo(function Statistics() {
  const entries = useApp((state) => state.data.entries);
  const history = useApp((state) => state.data.history);
  const stats = useMemo(
    () => statistics({ entries, history }),
    [entries, history],
  );
  const [range, setRange] = useState(12);
  const activityByMonth = useMemo(() => {
    const totals = new Map<string, number>();
    for (const event of history) {
      const date = new Date(event.at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      totals.set(key, (totals.get(key) ?? 0) + Math.max(0, event.episodeDelta));
    }
    return totals;
  }, [history]);
  const distribution = statuses.map((status, i) => ({
    status,
    count: entries.filter((e) => e.personalStatus === status).length,
    color: colors[i],
  }));
  const circumference = 2 * Math.PI * 72;
  let consumed = 0;
  const months = Array.from({ length: range }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - range + 1 + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleDateString(
        resolveLanguage(useApp.getState().data.preferences.language),
        { month: "short" },
      ),
      count: activityByMonth.get(key) ?? 0,
    };
  });
  const maxActivity = Math.max(
    3,
    Math.ceil(Math.max(0, ...months.map((m) => m.count)) / 3) * 3,
  );
  const points = months.map((m, i) => ({
    x: 35 + i * (650 / (months.length - 1)),
    y: 172 - (m.count / maxActivity) * 130,
    ...m,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const maxRating = Math.max(1, ...stats.ratings.map((r) => r[1]));
  return (
    <div className="page statistics-page">
      <PageTitle title={t("Statistics")} />
      <div className="statistics-summary">
        {[
          [Clapperboard, stats.total, "Anime"],
          [CheckCircle2, stats.completed, "Completed"],
          [Clock3, stats.hours, "Hours · estimated"],
          [Star, stats.mean ? stats.mean.toFixed(1) : "—", "Average rating"],
        ].map(([Icon, value, label], i) => {
          const MetricIcon = Icon as typeof Star;
          return (
            <div key={String(label)}>
              <span className="metric-icon" style={{ color: colors[i] }}>
                <MetricIcon size={20} />
              </span>
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
            </div>
          );
        })}
      </div>
      <div className="statistics-primary">
        <section className="chart-panel status-panel">
          <h2>{t("Your library")}</h2>
          <div className="donut-wrap">
            <svg
              viewBox="0 0 190 190"
              role="img"
              aria-label={`Library status: ${distribution.map((s) => `${s.count} ${s.status}`).join(", ")}`}
            >
              <circle
                cx="95"
                cy="95"
                r="72"
                fill="none"
                stroke="#eeeeee"
                strokeWidth="18"
              />
              {distribution
                .filter((d) => d.count)
                .map((d) => {
                  const arc =
                    (d.count / Math.max(1, stats.total)) * circumference;
                  const offset = -consumed;
                  consumed += arc;
                  return (
                    <circle
                      key={d.status}
                      cx="95"
                      cy="95"
                      r="72"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="18"
                      strokeDasharray={`${Math.max(0, arc - 3)} ${circumference}`}
                      strokeDashoffset={offset}
                      transform="rotate(-90 95 95)"
                    >
                      <title>
                        {d.status}: {d.count}
                      </title>
                    </circle>
                  );
                })}
              <text x="95" y="92" textAnchor="middle" className="donut-total">
                {stats.total}
              </text>
              <text x="95" y="116" textAnchor="middle" className="donut-label">
                {" "}
                {t("anime")}{" "}
              </text>
            </svg>
            <div className="chart-legend">
              {distribution.map((d) => (
                <div key={d.status}>
                  <i style={{ background: d.color }} />
                  <span>
                    {d.status === "Planning" ? t("Watchlist") : d.status}
                  </span>
                  <strong>{d.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="chart-panel activity-panel">
          <div className="chart-heading">
            <div>
              <h2>{t("Viewing activity")}</h2>
              <p>
                {stats.episodes} {t("episodes tracked ·")} {stats.rewatches}{" "}
                {t("rewatches")}{" "}
              </p>
            </div>
            <div className="chart-range">
              {[6, 12].map((n) => (
                <button
                  key={n}
                  aria-pressed={range === n}
                  onClick={() => setRange(n)}
                >
                  {n} {t("months")}{" "}
                </button>
              ))}
            </div>
          </div>
          <svg
            className="activity-chart"
            viewBox="0 0 720 210"
            role="img"
            aria-label={`Monthly episodes: ${months.map((m) => `${m.key}: ${m.count}`).join(", ")}`}
          >
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <line
                  x1="35"
                  x2="685"
                  y1={172 - i * 43.33}
                  y2={172 - i * 43.33}
                  stroke="#b3b3b3"
                  strokeDasharray="3 6"
                />
                <text x="25" y={176 - i * 43.33} textAnchor="end">
                  {Math.round((maxActivity * i) / 3)}
                </text>
              </g>
            ))}
            <polygon points={`35,172 ${line} 685,172`} fill="#537cbd18" />
            <polyline
              points={line}
              fill="none"
              stroke="#537cbd"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {points.map((p) => (
              <g key={p.key}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#537cbd"
                  tabIndex={0}
                  aria-label={t("{value0}: {value1} episodes", {
                    value0: p.key,
                    value1: p.count,
                  })}
                >
                  <title>
                    {p.key}: {p.count} {t("episodes")}{" "}
                  </title>
                </circle>
                <text x={p.x} y="200" textAnchor="middle">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </section>
      </div>
      <div className="statistics-secondary">
        <section className="chart-panel">
          <h2>{t("Your ratings")}</h2>
          <div
            className="rating-histogram"
            role="img"
            aria-label={stats.ratings
              .map(([rating, n]) => `${rating} stars: ${n}`)
              .join(", ")}
          >
            {stats.ratings.map(([rating, n]) => (
              <div key={rating}>
                <strong>{n || ""}</strong>
                <div className="histogram-track">
                  <i
                    style={{ height: `${(n / maxRating) * 100}%` }}
                    title={t("{value0} stars: {value1}", {
                      value0: rating,
                      value1: n,
                    })}
                  />
                </div>
                <span>{rating}</span>
              </div>
            ))}
          </div>
        </section>
        <HorizontalChart title={t("Genres")} items={stats.genres} />
      </div>
      <div className="statistics-secondary">
        <HorizontalChart title={t("Studios")} items={stats.studios} />
        <HorizontalChart title={t("Release decades")} items={stats.decades} />
      </div>
      <div className="statistics-secondary">
        <HorizontalChart
          title={t("Completions by month")}
          items={[...stats.months]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)}
        />
        <HorizontalChart title={t("Release seasons")} items={stats.seasons} />
      </div>
      <p className="muted stats-note">
        {" "}
        {t(
          "Hours use episode duration, or 24 minutes when unknown. Activity is based on your diary.",
        )}{" "}
      </p>
    </div>
  );
});
