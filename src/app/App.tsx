import { RetainedPage } from "../components/RetainedPage";
import { useReducedMotion } from "../core/motion";
import {
  useEffect,
  useLayoutEffect,
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
import { NavIndicator } from "../components/NavIndicator";
import {
  type Anime,
  type Entry,
  type Preferences,
  statuses,
} from "../domain/model";
import { Artwork, Modal, Stars } from "../components/ui";
import { HeaderSearch } from "../features/search/HeaderSearch";
import { SearchDialog, Discover } from "../features/search/Search";
import { Home, Diary } from "../features/personal/Personal";
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
const Calendar = lazy(() => import("../features/personal/Calendar"));
const Stats = lazy(() => import("../features/personal/Statistics"));
const sections = [
  ["Home", HomeIcon],
  ["Library", LibraryIcon],
  ["Watchlist", Bookmark],
  ["Recommend", Shuffle],
  ["Discover", Compass],
  ["Diary", BookOpen],
  ["Calendar", CalendarDays],
  ["Lists", Layers],
  ["Stats", ChartNoAxesCombined],
  ["Settings", SettingsIcon],
] as const;
export default function App() {
  const store = useApp();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);
  const section = store.data.preferences.section;
  const [search, setSearch] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [detail, setDetailState] = useState<Anime | null>(null);
  const routeTransition = useRef<ViewTransition | null>(null);
  const animateRoute = useCallback(
    (change: () => void | Promise<void>) => {
      routeTransition.current?.skipTransition();
      if (!document.startViewTransition || reducedMotion) {
        void change();
        return;
      }
      const transition = document.startViewTransition(change);
      routeTransition.current = transition;
      void transition.finished.catch(() => {});
    },
    [reducedMotion],
  );
  const content = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const originCover = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const [visited, setVisited] = useState<Preferences["section"][]>([]);
  // Bound detached DOM, subscriptions and graphics resources while retaining
  // nearby navigation state. Older pages rebuild from the persisted store.
  useEffect(() => {
    if (store.ready)
      setVisited((old) =>
        [...old.filter((panel) => panel !== section), section].slice(-3),
      );
  }, [section, store.ready]);
  const setDetail = useCallback(
    (anime: Anime | null) => {
      const focus = document.activeElement as HTMLElement | null;
      if (anime) {
        returnFocus.current = focus;
        scrollPositions.current.set(section, content.current?.scrollTop ?? 0);
        originCover.current =
          focus
            ?.closest("[data-anime-id]")
            ?.querySelector<HTMLElement>(
              ".cover-button > .artwork, .spotlight-cover > .artwork, .tonight-cover > .artwork, :scope > .artwork",
            ) ?? null;
      }
      const origin = originCover.current;
      const detailCover = content.current?.querySelector<HTMLElement>(
        "[data-detail-cover] > .artwork",
      );
      const before = anime ? origin : detailCover;
      const shared =
        !!origin &&
        (anime ? origin.isConnected : true) &&
        !!before &&
        before.getBoundingClientRect().height > 0;
      if (shared && before) before.style.viewTransitionName = "anime-cover";
      document.documentElement.dataset.detailTransition = "true";
      animateRoute(() => {
        if (before) before.style.viewTransitionName = "";
        flushSync(() => setDetailState(anime));
        const after = anime
          ? content.current?.querySelector<HTMLElement>(
              "[data-detail-cover] > .artwork",
            )
          : origin;
        if (shared && after) after.style.viewTransitionName = "anime-cover";
        const transition = routeTransition.current;
        const cleanup = () => {
          if (after) after.style.viewTransitionName = "";
          delete document.documentElement.dataset.detailTransition;
        };
        if (transition) void transition.finished.catch(() => {}).then(cleanup);
        else cleanup();
      });
    },
    [animateRoute, section],
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
  useLayoutEffect(() => {
    if (content.current)
      content.current.scrollTop = detail
        ? 0
        : (scrollPositions.current.get(section) ?? 0);
    if (detail)
      content.current
        ?.querySelector<HTMLElement>(".back-button")
        ?.focus({ preventScroll: true });
    else if (
      returnFocus.current?.isConnected &&
      !returnFocus.current.closest("[hidden]")
    ) {
      returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [section, detail]);
  const open = (entry: Entry) => setDetail(entry.cachedMetadata);
  const go = (to: Preferences["section"]) => {
    if (to === section && !detail) return;
    returnFocus.current = null;
    animateRoute(() => {
      flushSync(() => {
        setDetailState(null);
        setQuick(null);
        void store.prefs({ section: to });
      });
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
          <span className="rail-wordmark">Nexume</span>
        </button>
        <nav aria-label="Main navigation">
          <NavIndicator section={section} />
          {sections.map(([name, Icon]) => (
            <button
              key={name}
              className={`${section === name ? "active" : ""} ${name === "Settings" ? "settings-nav" : ""}`}
              aria-label={name}
              aria-current={section === name ? "page" : undefined}
              onClick={() => go(name)}
            >
              <Icon size={20} strokeWidth={1.3} />
              <span className="nav-tooltip">{name}</span>
              {name === "Library" && (
                <small className="nav-count">{store.data.entries.length}</small>
              )}
            </button>
          ))}
        </nav>
        <button
          className="rail-profile"
          aria-label="Your profile"
          aria-current={section === "Profile" && !detail ? "page" : undefined}
          onClick={() => go("Profile")}
        >
          {store.data.profile.avatar ? (
            <Artwork
              src={store.data.profile.avatar}
              title={
                store.data.profile.displayName || store.data.profile.username
              }
              eager
            />
          ) : (
            <span>{store.data.profile.username.slice(0, 1).toUpperCase()}</span>
          )}
        </button>
      </aside>
      <div className="app-shell" data-reduced-motion={reducedMotion}>
        <header className="topbar">
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
          onScroll={(event) => {
            if (!detail)
              scrollPositions.current.set(
                section,
                event.currentTarget.scrollTop,
              );
          }}
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
              {detail && (
                <Detail
                  key={detail.anilistId}
                  anime={detail}
                  backLabel={`Back to ${section}`}
                  onBack={() => setDetail(null)}
                />
              )}
              {[...new Set([...visited, section])].map((panel) => (
                <RetainedPage key={panel} active={!detail && panel === section}>
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="route-loading" role="status">
                          <span
                            className="route-loading-orbit"
                            aria-hidden="true"
                          />
                          <span>
                            Opening {panel === "Stats" ? "Statistics" : panel}…
                          </span>
                        </div>
                      }
                    >
                      {panel === "Home" ? (
                        <Home
                          onOpen={open}
                          onSearch={() => setSearch(true)}
                          onSample={() => setSample(true)}
                          onAnime={setDetail}
                        />
                      ) : panel === "Library" ? (
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
                      ) : panel === "Discover" ? (
                        <Discover onOpen={setDetail} />
                      ) : panel === "Watchlist" ? (
                        <Watchlist
                          onOpen={open}
                          onSearch={() => setSearch(true)}
                        />
                      ) : panel === "Recommend" ? (
                        <Recommend onOpen={setDetail} />
                      ) : panel === "Diary" ? (
                        <Diary onOpen={open} onSearch={() => setSearch(true)} />
                      ) : panel === "Calendar" ? (
                        <Calendar onOpen={open} />
                      ) : panel === "Stats" ? (
                        <Stats />
                      ) : panel === "Lists" ? (
                        <Lists onOpen={open} />
                      ) : panel === "Profile" ? (
                        <Profile onOpen={open} />
                      ) : (
                        <Settings onSample={() => setSample(true)} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                </RetainedPage>
              ))}
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
