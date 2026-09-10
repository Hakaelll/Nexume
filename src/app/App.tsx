import {
  useEffect,
  useCallback,
  useState,
  useRef,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
import {
  Home as HomeIcon,
  Library as LibraryIcon,
  Compass,
  BookOpen,
  CalendarDays,
  Layers,
  UserRound,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  WifiOff,
  Plus,
  Heart,
  Star,
  Trash2,
  Edit3,
  RefreshCw,
  ArrowUpRight,
  X,
  Bookmark,
  Shuffle,
} from "lucide-react";
import { flushSync } from "react-dom";
import { useApp } from "./store";
import {
  type Anime,
  type Entry,
  type Preferences,
  statuses,
} from "../domain/model";
import { Modal, Stars } from "../components/ui";
import { HeaderSearch } from "../features/search/HeaderSearch";
import { SearchDialog, Discover } from "../features/search/Search";
import { Home, Diary, Calendar, Stats } from "../features/personal/Personal";
import Detail from "../features/anime-detail/Detail";
import { anilist } from "../services/anilist/provider";
import { addSample, sampleEntries } from "../core/sample";
import { flushQueue } from "../services/social/sync";
const Library = lazy(() => import("../features/library/Library"));
const Lists = lazy(() => import("../features/lists/Lists"));
const Profile = lazy(() => import("../features/profile/Profile"));
const Settings = lazy(() => import("../features/settings/Settings"));
const Watchlist = lazy(() => import("../features/watchlist/Watchlist"));
const Recommend = lazy(() => import("../features/recommend/Recommend"));
const sections = [
  ["Home", HomeIcon],
  ["Library", LibraryIcon],
  ["Watchlist", Bookmark],
  ["Recommend", Shuffle],
  ["Discover", Compass],
  ["Diary", BookOpen],
  ["Calendar", CalendarDays],
  ["Lists", Layers],
  ["Profile", UserRound],
  ["Stats", ChartNoAxesCombined],
  ["Settings", SettingsIcon],
] as const;
export default function App() {
  const store = useApp();
  const section = store.data.preferences.section;
  const [search, setSearch] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [detail, setDetailState] = useState<Anime | null>(null);
  const routeTransition = useRef<ViewTransition | null>(null);
  const animateRoute = useCallback(
    (change: () => void | Promise<void>) => {
      routeTransition.current?.skipTransition();
      if (
        !document.startViewTransition ||
        store.data.preferences.reducedMotion ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        void change();
        return;
      }
      const transition = document.startViewTransition(change);
      routeTransition.current = transition;
      void transition.finished.catch(() => {});
    },
    [store.data.preferences.reducedMotion],
  );
  const setDetail = useCallback(
    (anime: Anime | null) => {
      animateRoute(() => {
        flushSync(() => setDetailState(anime));
      });
    },
    [animateRoute],
  );
  const [quick, setQuick] = useState<Anime | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [sample, setSample] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    entryId: string;
  } | null>(null);
  const [remove, setRemove] = useState<Entry | null>(null);
  const [chooseList, setChooseList] = useState<Entry | null>(null);
  const [rating, setRating] = useState<Entry | null>(null);
  const [splash, setSplash] = useState(true);
  const content = useRef<HTMLElement>(null);
  const contextEntry = store.data.entries.find(
    (e) => e.localId === context?.entryId,
  );
  useEffect(() => {
    void store.init();
    const timer = setTimeout(() => setSplash(false), 650);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  useEffect(() => {
    if (!store.ready) return;
    void flushQueue();
    const timer = setInterval(() => void flushQueue(), 30000);
    return () => clearInterval(timer);
  }, [store.ready, offline]);
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [section, detail]);
  const open = (entry: Entry) => setDetail(entry.cachedMetadata);
  const go = (to: Preferences["section"]) => {
    if (to === section && !detail) return;
    animateRoute(async () => {
      flushSync(() => {
        setDetailState(null);
        setQuick(null);
      });
      await store.prefs({ section: to });
    });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const input = (e.target as HTMLElement).closest(
        "input,textarea,select,[contenteditable=true]",
      );
      if (e.ctrlKey) {
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          setSearch(true);
        } else if (
          ["l", "h", ","].includes(e.key.toLowerCase()) &&
          !document.querySelector("dialog[open]")
        ) {
          e.preventDefault();
          setDetail(null);
          void useApp.getState().prefs({
            section:
              e.key.toLowerCase() === "l"
                ? "Library"
                : e.key.toLowerCase() === "h"
                  ? "Home"
                  : "Settings",
          });
        }
        return;
      }
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        if (context) setContext(null);
        else if (detail) setDetail(null);
      }
      if (!input && !document.querySelector("dialog[open]") && detail) {
        const entry = useApp
          .getState()
          .data.entries.find((a) => a.anilistId === detail.anilistId);
        if (entry && e.key.toLowerCase() === "f")
          void useApp.getState().edit(entry.localId, { liked: !entry.liked });
        if (entry && e.key.toLowerCase() === "r") setRating(entry);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [detail, context, setDetail]);
  useEffect(() => {
    if (!context) return;
    const close = () => setContext(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [context]);
  const loadSample = async () => {
    setSampleBusy(true);
    try {
      const entries = await sampleEntries();
      await store.mutate((d) => addSample(d, entries));
      if (!useApp.getState().error) {
        setSample(false);
        store.notify("Sample collection added.");
      }
    } catch (e) {
      store.notify(String(e));
    } finally {
      setSampleBusy(false);
    }
  };
  const refresh = async (entry: Entry) => {
    try {
      const [m] = await anilist.byIds([entry.anilistId]);
      if (m)
        await store.edit(entry.localId, {
          cachedMetadata: m,
          coverImage: m.coverImage,
          bannerImage: m.bannerImage,
          totalEpisodes:
            m.episodes === null
              ? entry.totalEpisodes
              : Math.max(entry.watchedEpisodes, m.episodes),
          lastMetadataRefresh: m.fetchedAt,
        });
    } catch (e) {
      store.notify(String(e));
    }
  };
  if (!store.ready)
    return (
      <div className="startup">
        <img src="/brand/logo.png" alt="Nexume" />
        {store.error && (
          <div role="alert">
            <p>{store.error}</p>
            <button className="button" onClick={() => void store.init()}>
              Retry opening collection
            </button>
            <p>Your saved data has not been replaced.</p>
          </div>
        )}
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="nav-rail">
        <button
          className="brand"
          aria-label="Nexume Home"
          onClick={() => go("Home")}
        >
          <img src="/brand/logo.png" alt="" />
        </button>
        <nav aria-label="Main navigation">
          {sections.map(([name, Icon]) => (
            <button
              key={name}
              className={`${section === name && !detail ? "active" : ""} ${name === "Settings" ? "settings-nav" : ""}`}
              aria-label={name}
              aria-current={section === name ? "page" : undefined}
              onClick={() => go(name)}
            >
              <Icon size={20} strokeWidth={1.3} />
              <span className="nav-tooltip">{name}</span>
            </button>
          ))}
        </nav>
        <button
          className="rail-profile"
          aria-label="Your profile"
          onClick={() => go("Profile")}
        >
          {store.data.profile.username.slice(0, 1).toUpperCase()}
        </button>
      </aside>
      <div
        className="app-shell"
        data-reduced-motion={store.data.preferences.reducedMotion}
      >
        <header className="topbar">
          <button className="wordmark" onClick={() => go("Home")}>
            NEXUME
          </button>
          <div className="topbar-right">
            {offline ? (
              <span className="connection">
                <WifiOff size={12} />
                Offline
              </span>
            ) : null}
            {store.data.queue.length > 0 && (
              <button className="text-button" onClick={() => go("Settings")}>
                Pending sync
              </button>
            )}
            <HeaderSearch
              query={headerQuery}
              onQuery={setHeaderQuery}
              onOpen={setDetail}
              onFullSearch={() => setSearch(true)}
            />
          </div>
        </header>
        <main
          key={`${section}-${detail?.anilistId ?? "index"}`}
          id="main"
          tabIndex={-1}
          ref={content}
          className={`main-content ${section === "Library" && !detail ? "is-library" : ""}`}
        >
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="scene-loading">Opening your collection…</div>
              }
            >
              {detail ? (
                <Detail anime={detail} onBack={() => setDetail(null)} />
              ) : section === "Home" ? (
                <Home
                  onOpen={open}
                  onSearch={() => setSearch(true)}
                  onSample={() => setSample(true)}
                  onAnime={setDetail}
                />
              ) : section === "Library" ? (
                <Library
                  onSample={() => setSample(true)}
                  onOpen={open}
                  onSearch={() => setSearch(true)}
                  onQuick={(e) => setQuick(e.cachedMetadata)}
                  onContext={(e, entry) => {
                    e.preventDefault();
                    setContext({
                      x: Math.min(e.clientX, window.innerWidth - 260),
                      y: Math.min(e.clientY, window.innerHeight - 480),
                      entryId: entry.localId,
                    });
                  }}
                />
              ) : section === "Discover" ? (
                <Discover onOpen={setDetail} />
              ) : section === "Watchlist" ? (
                <Watchlist onOpen={open} onSearch={() => setSearch(true)} />
              ) : section === "Recommend" ? (
                <Recommend onOpen={setDetail} />
              ) : section === "Diary" ? (
                <Diary onOpen={open} onSearch={() => setSearch(true)} />
              ) : section === "Calendar" ? (
                <Calendar onOpen={open} />
              ) : section === "Stats" ? (
                <Stats />
              ) : section === "Lists" ? (
                <Lists onOpen={open} />
              ) : section === "Profile" ? (
                <Profile onOpen={open} />
              ) : (
                <Settings onSample={() => setSample(true)} />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {store.error && (
        <div className="save-error" role="alert">
          <span>{store.error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => useApp.setState({ error: "" })}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {store.notice && (
        <div className="toast" role="status">
          {store.notice}
        </div>
      )}
      {store.saving && (
        <span className="saving-status" role="status">
          Saving…
        </span>
      )}
      {search && (
        <SearchDialog
          initialQuery={headerQuery}
          onClose={() => {
            setSearch(false);
            setHeaderQuery("");
          }}
          onOpen={setDetail}
        />
      )}{" "}
      {quick && (
        <Modal title="Quick view" onClose={() => setQuick(null)} wide>
          <Detail anime={quick} quick onBack={() => setQuick(null)} />
        </Modal>
      )}
      {sample && (
        <Modal title="Sample collection" onClose={() => setSample(false)}>
          <p className="prose">
            12 anime with example progress and ratings. Your existing entries
            are kept.
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setSample(false)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={sampleBusy}
              onClick={() => void loadSample()}
            >
              {sampleBusy ? "Adding…" : "Add sample collection"}
            </button>
          </div>
        </Modal>
      )}
      {context && contextEntry && (
        <div
          className="context-menu"
          role="menu"
          aria-label={`Actions for ${contextEntry.preferredTitle}`}
          style={{ left: context.x, top: Math.max(8, context.y) }}
          onKeyDown={(e) => {
            const buttons = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              buttons[
                (index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) %
                  buttons.length
              ]?.focus();
            }
          }}
        >
          <button role="menuitem" autoFocus onClick={() => open(contextEntry)}>
            <ArrowUpRight size={14} />
            Open
          </button>
          <button
            role="menuitem"
            onClick={() => void store.adjustEpisodes(contextEntry.localId, 1)}
          >
            <Plus size={14} />
            +1 episode
          </button>
          <label>
            Status
            <select
              value={contextEntry.personalStatus}
              onChange={(e) =>
                void store.edit(contextEntry.localId, {
                  personalStatus: e.target.value as Entry["personalStatus"],
                })
              }
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button role="menuitem" onClick={() => setRating(contextEntry)}>
            <Star size={14} />
            Rate
          </button>
          <button
            role="menuitem"
            onClick={() =>
              void store.edit(contextEntry.localId, {
                liked: !contextEntry.liked,
              })
            }
          >
            <Heart size={14} />
            {contextEntry.liked ? "Unlike" : "Like"}
          </button>
          <button role="menuitem" onClick={() => setChooseList(contextEntry)}>
            <Layers size={14} />
            Add to list
          </button>
          <button
            role="menuitem"
            onClick={() =>
              void store.edit(contextEntry.localId, {
                favorite: !contextEntry.favorite,
              })
            }
          >
            <Star size={14} />
            {contextEntry.favorite ? "Remove favorite" : "Favorite"}
          </button>
          <button role="menuitem" onClick={() => open(contextEntry)}>
            <Edit3 size={14} />
            Edit review
          </button>
          <button
            role="menuitem"
            disabled={offline}
            onClick={() => void refresh(contextEntry)}
          >
            <RefreshCw size={14} />
            Refresh metadata
          </button>
          <button role="menuitem" onClick={() => setRemove(contextEntry)}>
            <Trash2 size={14} />
            Remove from library
          </button>
        </div>
      )}
      {remove && (
        <Modal
          title={`Remove ${remove.preferredTitle}?`}
          onClose={() => setRemove(null)}
        >
          <p className="prose">
            This removes its progress, reviews and diary events from this
            collection and its lists. Export a backup first if you want to keep
            a copy.
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setRemove(null)}>
              Keep anime
            </button>
            <button
              className="button"
              onClick={() =>
                void store.remove(remove.localId).then(() => {
                  if (!useApp.getState().error) setRemove(null);
                })
              }
            >
              Remove from library
            </button>
          </div>
        </Modal>
      )}
      {chooseList && (
        <Modal title="Add to a list" onClose={() => setChooseList(null)}>
          {store.data.lists.length ? (
            store.data.lists.map((l) => (
              <button
                className="setting-action"
                key={l.id}
                onClick={() =>
                  void store
                    .mutate((d) => ({
                      ...d,
                      lists: d.lists.map((list) =>
                        list.id === l.id
                          ? {
                              ...list,
                              entryIds: [
                                ...new Set([
                                  ...list.entryIds,
                                  chooseList.localId,
                                ]),
                              ],
                            }
                          : list,
                      ),
                    }))
                    .then(() => setChooseList(null))
                }
              >
                {l.title}
              </button>
            ))
          ) : (
            <p>Create a list in Lists first.</p>
          )}
        </Modal>
      )}
      {rating && (
        <Modal
          title={`Rate ${rating.preferredTitle}`}
          onClose={() => setRating(null)}
        >
          <Stars
            value={
              store.data.entries.find((e) => e.localId === rating.localId)
                ?.personalRating ?? null
            }
            onChange={(value) =>
              void store.edit(rating.localId, { personalRating: value })
            }
          />
        </Modal>
      )}
      {splash && (
        <div className="splash" aria-hidden="true">
          <img src="/brand/logo.png" alt="" />
        </div>
      )}
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h2>This view couldn't open.</h2>
        <p>{this.state.error}</p>
        <button
          className="button"
          onClick={() => {
            this.setState({ error: "" });
            void useApp.getState().prefs({ section: "Library", view: "Grid" });
          }}
        >
          Open Library in Grid
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
