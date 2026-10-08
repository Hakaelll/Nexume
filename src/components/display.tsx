import { t, useLanguage } from "../core/i18n";
import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { whenNearViewport } from "../core/viewport";
const passthrough = (url: string) => Promise.resolve(url);
export function Artwork({
  src,
  title,
  className = "",
  eager = false,
  fallbackSrc = "",
  resolveImage = passthrough,
}: {
  src: string;
  title: string;
  className?: string;
  eager?: boolean;
  fallbackSrc?: string;
  resolveImage?: (url: string) => Promise<string>;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const attempted = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    setFailed(false);
    attempted.current.clear();
    setUrl("");
    const load = () => {
      void resolveImage(src || fallbackSrc)
        .catch(() => src || fallbackSrc)
        .then((u) => {
          if (active) setUrl(u);
        });
    };
    let stop: (() => void) | undefined;
    if (eager) load();
    else if (ref.current) stop = whenNearViewport(ref.current, load);
    return () => {
      active = false;
      stop?.();
    };
  }, [src, fallbackSrc, eager, resolveImage]);
  return (
    <div ref={ref} className={`artwork ${className}`}>
      {url && !failed ? (
        <img
          src={url}
          alt={title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onError={() => {
            // A cached native asset can become unavailable after cache eviction.
            attempted.current.add(url);
            const next = [src, fallbackSrc].find(
              (candidate) => candidate && !attempted.current.has(candidate),
            );
            if (next) setUrl(next);
            else setFailed(true);
          }}
        />
      ) : (
        <div className="cover-placeholder">
          <strong>{title}</strong>
        </div>
      )}
    </div>
  );
}
export function Stars({
  value,
  onChange,
  label = "Your rating",
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  label?: string;
}) {
  useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div
      className={`rating ${onChange ? "editable" : ""}`}
      aria-label={`${label}: ${value === null ? t("Not rated") : `${value / 2} out of 5 stars`}`}
    >
      <div
        className="stars"
        role={onChange ? "slider" : undefined}
        tabIndex={onChange ? 0 : undefined}
        aria-label={onChange ? t(label) : undefined}
        aria-valuemin={onChange ? 0.5 : undefined}
        aria-valuemax={onChange ? 5 : undefined}
        aria-valuenow={onChange ? (value ?? 1) / 2 : undefined}
        aria-valuetext={value === null ? t("Not rated") : `${value / 2} stars`}
        onKeyDown={(e) => {
          if (!onChange) return;
          if (
            [
              "ArrowLeft",
              "ArrowDown",
              "ArrowRight",
              "ArrowUp",
              "Home",
              "End",
              "Delete",
              "Backspace",
            ].includes(e.key)
          ) {
            e.preventDefault();
            onChange(
              e.key === "Delete" || e.key === "Backspace"
                ? null
                : e.key === "Home"
                  ? 1
                  : e.key === "End"
                    ? 10
                    : Math.max(
                        1,
                        Math.min(
                          10,
                          (value ?? 0) +
                            (["ArrowRight", "ArrowUp"].includes(e.key)
                              ? 1
                              : -1),
                        ),
                      ),
            );
          }
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span className="star" key={i}>
            <Star size={16} />
            <span
              className="star-fill"
              style={{
                width: `${(Math.max(0, Math.min(2, shown - i * 2)) / 2) * 100}%`,
              }}
            >
              <Star size={16} />
            </span>
            {onChange &&
              [1, 2].map((half) => (
                <button
                  key={half}
                  tabIndex={-1}
                  aria-label={t("Rate {value0} stars", {
                    value0: (i * 2 + half) / 2,
                  })}
                  className={`star-hit half-${half}`}
                  onMouseEnter={() => setHover(i * 2 + half)}
                  onClick={() => onChange(i * 2 + half)}
                />
              ))}
          </span>
        ))}
      </div>
      <span className="rating-number">
        {shown ? (shown / 2).toFixed(1) : "—"}
      </span>
      {onChange && value !== null && (
        <button
          className="icon-button rating-clear"
          aria-label={t("Clear rating")}
          onClick={() => onChange(null)}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
