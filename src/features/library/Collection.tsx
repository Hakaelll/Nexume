import { t, useLanguage } from "../../core/i18n";
import { useReducedMotion } from "../../core/motion";
import { animeCover } from "../../domain/artwork";
import { useEffect, useRef, useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart } from "lucide-react";
import {
  CollectionRenderer,
  type RendererConfig,
} from "../../graphics/CollectionRenderer";
import { navigate } from "../../graphics/layout";
import { type Entry } from "../../domain/model";
import { useApp } from "../../app/store";
import { cachedImage } from "../../core/platform";
import { Stars, Artwork } from "../../components/ui";
export default function Collection({
  entries,
  onOpen,
  onQuick,
  onContext,
}: {
  entries: Entry[];
  onOpen: (e: Entry) => void;
  onQuick: (e: Entry) => void;
  onContext: (
    event: Pick<MouseEvent, "clientX" | "clientY" | "preventDefault">,
    entry: Entry,
  ) => void;
}) {
  useLanguage();
  const p = useApp((state) => state.data.preferences);
  const prefs = useApp((state) => state.prefs);
  const edit = useApp((state) => state.edit);
  const index = Math.max(
    0,
    entries.findIndex((e) => e.localId === p.selectedId),
  );
  const selected = entries[index];
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<CollectionRenderer | null>(null);
  const [metrics, setMetrics] = useState({
    frameMs: 0,
    drawCalls: 0,
    textures: 0,
    activeCases: 0,
    textureMB: 0,
    heapMB: null as number | null,
  });
  const reducedMotion = useReducedMotion();
  const items = useMemo(
    () =>
      entries.map((e) => ({
        id: e.localId,
        title: e.preferredTitle,
        cover: animeCover(e.cachedMetadata, e.coverImage),
      })),
    [entries],
  );
  const config: RendererConfig = {
    items,
    selected: index,
    quality: p.quality,
    reducedMotion: reducedMotion,
    resolveImage: cachedImage,
    onSelect: (i) => void prefs({ selectedId: entries[i].localId }),
    onOpen: (i) => onOpen(entries[i]),
    onContext: (i, event) => onContext(event, entries[i]),
    onFailure: () => {
      void prefs({ view: "Grid" });
      useApp
        .getState()
        .notify("Graphics unavailable. Your collection is ready in Grid view.");
    },
    onMetrics: p.diagnostics ? setMetrics : undefined,
  };
  const configRef = useRef(config);
  configRef.current = config;
  useEffect(() => {
    if (!host.current) return;
    try {
      renderer.current = new CollectionRenderer(
        host.current,
        configRef.current,
      );
    } catch {
      configRef.current.onFailure();
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    renderer.current?.update(configRef.current);
  }, [items, index, p.quality, p.diagnostics, reducedMotion]);
  const move = (delta: number) => {
    const next = navigate(index, delta, entries.length);
    if (next !== index) void prefs({ selectedId: entries[next].localId });
  };
  const actionRef = useRef({ move, onOpen, onQuick, selected });
  actionRef.current = { move, onOpen, onQuick, selected };
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let amount = 0,
      last = 0;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      amount += e.deltaY;
      if (Math.abs(amount) > 45 && performance.now() - last > 170) {
        actionRef.current.move(Math.sign(amount));
        amount = 0;
        last = performance.now();
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <section
      className="collection-stage"
      tabIndex={0}
      aria-label={t(
        "Spatial collection. Arrow keys select, Enter opens, Space previews.",
      )}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "button,input,textarea,select,[role=slider]",
          )
        )
          return;
        if (
          ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)
        ) {
          e.preventDefault();
          move(["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1);
        }
        if (e.key === "Enter") onOpen(selected);
        if (e.code === "Space") {
          e.preventDefault();
          onQuick(selected);
        }
        if (e.key.toLowerCase() === "f")
          void edit(selected.localId, { liked: !selected.liked });
        if (e.key.toLowerCase() === "r")
          document
            .querySelector<HTMLElement>(".collection-rating [role=slider]")
            ?.focus();
      }}
    >
      <div
        className="collection-heading"
        key={`heading-${selected.localId}`}
        aria-live="polite"
      >
        <p className="eyebrow">
          {t(selected.personalStatus).toUpperCase()}{" "}
          <span className="dot">·</span>{" "}
          {selected.cachedMetadata.year ?? "UNDATED"}
        </p>
        <h2>{selected.preferredTitle}</h2>
        <div className="collection-rating">
          <Stars
            value={selected.personalRating}
            onChange={(v) => void edit(selected.localId, { personalRating: v })}
          />
          <button
            className="icon-button"
            aria-label={t("Like selected anime")}
            aria-pressed={selected.liked}
            onClick={() =>
              void edit(selected.localId, { liked: !selected.liked })
            }
          >
            <Heart size={15} fill={selected.liked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      <div className="webgl-host" ref={host} />
      <div className="collection-thought" key={selected.localId}>
        {selected.shortOpinion ? (
          <blockquote>“{selected.shortOpinion}”</blockquote>
        ) : null}
        <p className="eyebrow">
          {selected.watchedEpisodes} / {selected.totalEpisodes ?? "?"}{" "}
          {t("EPISODES")}{" "}
          {selected.watchedDate
            ? ` · ${new Date(selected.watchedDate).getFullYear()}`
            : ""}
        </p>
        <button className="text-button" onClick={() => onOpen(selected)}>
          {" "}
          {t("Explore this anime")} <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="collection-navigation">
        <button
          className="circle-button"
          aria-label={t("Previous anime")}
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          <ArrowLeft size={18} />
        </button>
        <span>
          {String(index + 1).padStart(2, "0")}{" "}
          <span className="muted">
            / {String(entries.length).padStart(2, "0")}
          </span>
        </span>
        <button
          className="circle-button"
          aria-label={t("Next anime")}
          disabled={index === entries.length - 1}
          onClick={() => move(1)}
        >
          <ArrowRight size={18} />
        </button>
      </div>
      <div className="collection-filmstrip" aria-label={t("Jump to anime")}>
        {entries
          .slice(Math.max(0, index - 4), Math.min(entries.length, index + 5))
          .map((e) => (
            <button
              key={e.localId}
              className="filmstrip-item"
              aria-label={t("Select {value0}", { value0: e.preferredTitle })}
              aria-pressed={e.localId === selected.localId}
              onClick={() => void prefs({ selectedId: e.localId })}
            >
              <Artwork
                src={animeCover(e.cachedMetadata, e.coverImage)}
                fallbackSrc={e.coverImage}
                title=""
              />
              <span>{e.preferredTitle}</span>
            </button>
          ))}
      </div>
      <div className="collection-hint">
        <span>{t("SCROLL TO EXPLORE")}</span>
        <span>
          <kbd>←</kbd> <kbd>→</kbd> {t("SELECT")} <span className="dot">·</span>{" "}
          <kbd>↵</kbd> {t("OPEN")}{" "}
        </span>
      </div>
      {p.diagnostics && (
        <output className="graphics-metrics">
          {metrics.frameMs.toFixed(1)} {t("ms ·")} {metrics.drawCalls}{" "}
          {t("draws ·")} {metrics.textures} {t("textures ·")}{" "}
          {metrics.activeCases} {t("cases")} {" · "}
          {metrics.textureMB.toFixed(1)} {t("MB textures (est.)")}{" "}
          {metrics.heapMB !== null && ` · ${metrics.heapMB.toFixed(0)} MB heap`}
        </output>
      )}
    </section>
  );
}
