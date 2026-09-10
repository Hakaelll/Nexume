import { useEffect, useState } from "react";
import { Download, Upload, RefreshCw, LogOut, Check } from "lucide-react";
import { useApp } from "../../app/store";
import { type AppData, type OnlineIdentity } from "../../domain/model";
import {
  exportBackup,
  exportCsv,
  parseBackup,
  mergeBackup,
} from "../../domain/backup";
import { native, readBackupFile, saveText } from "../../core/platform";
import { PageTitle, Modal } from "../../components/ui";
import { social } from "../../services/social/provider";
import { flushQueue } from "../../services/social/sync";
import { anilist } from "../../services/anilist/provider";
export default function Settings({ onSample }: { onSample: () => void }) {
  const store = useApp();
  const p = store.data.preferences;
  const [incoming, setIncoming] = useState<AppData | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [identity, setIdentity] = useState<OnlineIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void social.identity().then(setIdentity);
  }, []);
  const report = (e: unknown) =>
    store.notify(e instanceof Error ? e.message : String(e));
  const backup = async () => {
    try {
      if (
        await saveText(
          `Nexume-Backup-${new Date().toISOString().slice(0, 10)}.json`,
          exportBackup(store.data),
        )
      )
        store.notify("Backup saved.");
    } catch (e) {
      report(e);
    }
  };
  const load = async () => {
    try {
      const raw = await readBackupFile();
      if (raw) setIncoming(parseBackup(raw));
    } catch (e) {
      report(e);
    }
  };
  const restore = async () => {
    if (!incoming) return;
    try {
      const current = useApp.getState().data;
      const snapshot = exportBackup(current);
      const saved = await saveText(
        `Nexume-before-restore-${Date.now()}.json`,
        snapshot,
      );
      if (!saved) return;
      await store.mutate((d) =>
        restoreMode === "merge"
          ? mergeBackup(d, incoming)
          : {
              ...incoming,
              queue: [],
              preferences: { ...incoming.preferences, publications: [] },
            },
      );
      if (!useApp.getState().error) {
        setIncoming(null);
        store.notify("Collection restored.");
      }
    } catch (e) {
      report(e);
    }
  };
  const auth = async (signup = false) => {
    setBusy(true);
    setMessage("");
    try {
      if (signup) setMessage(await social.signUp(email, password));
      else await social.signIn(email, password);
      setPassword("");
      setIdentity(await social.identity());
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setBusy(true);
    try {
      const metadata = await anilist.byIds(
        store.data.entries.map((e) => e.anilistId),
      );
      await store.mutate((d) => ({
        ...d,
        entries: d.entries.map((e) => {
          const m = metadata.find((m) => m.anilistId === e.anilistId);
          return m
            ? {
                ...e,
                cachedMetadata: m,
                coverImage: m.coverImage,
                bannerImage: m.bannerImage,
                totalEpisodes:
                  m.episodes === null
                    ? e.totalEpisodes
                    : Math.max(e.watchedEpisodes, m.episodes),
                lastMetadataRefresh: m.fetchedAt,
              }
            : e;
        }),
      }));
      store.notify(`Refreshed ${metadata.length} titles.`);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page settings-page">
      <PageTitle title="Settings" />
      <section className="settings-section">
        <div>
          <h2>Collection & display</h2>
        </div>
        <div className="settings-controls">
          <label className="setting-row">
            <span>Graphics quality</span>
            <select
              value={p.quality}
              onChange={(e) =>
                void store.prefs({
                  quality: e.target.value as typeof p.quality,
                })
              }
            >
              {["High", "Balanced", "Low"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>
              Reduce motion<small>System preferences are also respected.</small>
            </span>
            <input
              type="checkbox"
              checked={p.reducedMotion}
              onChange={(e) =>
                void store.prefs({ reducedMotion: e.target.checked })
              }
            />
          </label>
          <label className="setting-row">
            <span>
              Graphics diagnostics
              <small>Frame time, draw calls and active resources.</small>
            </span>
            <input
              type="checkbox"
              checked={p.diagnostics}
              onChange={(e) =>
                void store.prefs({ diagnostics: e.target.checked })
              }
            />
          </label>
          <label className="setting-row">
            <span>Include adult anime in online results</span>
            <input
              type="checkbox"
              checked={p.adultContent}
              onChange={(e) =>
                void store.prefs({ adultContent: e.target.checked })
              }
            />
          </label>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Data & backups</h2>
          <p>
            {native
              ? "Saved on this computer."
              : "Browser preview · stored in this browser, separately from the Windows app."}
          </p>
        </div>
        <div className="settings-controls">
          <button className="setting-action" onClick={() => void backup()}>
            <Download size={18} />
            <span>
              Export Nexume backup
              <small>Library, ratings, reviews, lists and profile.</small>
            </span>
          </button>
          <button className="setting-action" onClick={() => void load()}>
            <Upload size={18} />
            <span>
              Restore a backup
              <small>Preview its contents before merging or replacing.</small>
            </span>
          </button>
          <button
            className="setting-action"
            onClick={() =>
              void saveText("Nexume-Library.csv", exportCsv(store.data)).catch(
                report,
              )
            }
          >
            <Download size={18} />
            <span>
              Export library as CSV<small>Portable tabular data.</small>
            </span>
          </button>
          <button
            className="setting-action"
            disabled={busy || !navigator.onLine || !store.data.entries.length}
            onClick={() => void refresh()}
          >
            <RefreshCw size={18} />
            <span>
              Refresh cached metadata
              <small>
                Updates artwork and schedules without changing your opinions.
              </small>
            </span>
          </button>
          <button className="setting-action" onClick={onSample}>
            <PlusSymbol />
            <span>
              Load a sample collection
              <small>Optional sample records for trying the app.</small>
            </span>
          </button>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Sharing</h2>
        </div>
        <div className="settings-controls">
          {!social.configured ? (
            <div className="configuration-note">
              <h3>Online sharing: Not configured</h3>
              <details>
                <summary>Setup</summary>
                <p>
                  Configure Supabase and a public viewer URL as described in
                  README.md.
                </p>
              </details>
            </div>
          ) : identity ? (
            <>
              <p>
                <Check size={14} />
                Signed in as {identity.email}
              </p>
              <button
                className="button"
                onClick={() =>
                  void social
                    .signOut()
                    .then(() => setIdentity(null))
                    .catch(report)
                }
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void auth();
              }}
            >
              <label className="field">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button
                  className="button"
                  type="button"
                  disabled={busy || !email || password.length < 8}
                  onClick={() => void auth(true)}
                >
                  Create account
                </button>
                <button className="button primary" disabled={busy}>
                  Sign in
                </button>
              </div>
            </form>
          )}
          {message && <p role="status">{message}</p>}
          {store.data.queue.length > 0 && (
            <div className="sync-status">
              <h3>{store.data.queue.length} pending updates</h3>
              {store.data.queue.map((q) => (
                <p key={q.id}>
                  {q.kind} · {q.attempts} attempts{" "}
                  {q.error && <small>{q.error}</small>}
                </p>
              ))}
              <button
                className="button"
                disabled={!navigator.onLine || !identity}
                onClick={() => void flushQueue(true)}
              >
                Retry pending sync
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Keyboard shortcuts</h2>
        </div>
        <dl className="shortcut-list">
          {[
            ["Ctrl + K", "Search anime"],
            ["Ctrl + L", "Library"],
            ["Ctrl + H", "Home"],
            ["Ctrl + ,", "Settings"],
            ["← / → / ↑ / ↓", "Select in Collection"],
            ["Enter", "Open selected anime"],
            ["Space", "Quick view"],
            ["F", "Like selected anime"],
            ["R", "Focus rating"],
            ["Escape", "Back / close overlay"],
          ].map(([key, label]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </section>
      <footer className="about">
        <img src="/brand/logo.png" alt="Nexume logo" />
        <div>
          <h2>
            Nexume <small>0.2.1</small>
          </h2>
          <span>Metadata by AniList</span>
        </div>
      </footer>
      {incoming && (
        <Modal
          title="Restore your collection"
          onClose={() => setIncoming(null)}
        >
          <p className="prose">
            This backup contains {incoming.entries.length} anime,{" "}
            {incoming.entries.filter((e) => e.review).length} reviews,{" "}
            {incoming.lists.length} lists and {incoming.history.length} diary
            events.
          </p>
          <label className="field">
            Restore method
            <select
              value={restoreMode}
              onChange={(e) =>
                setRestoreMode(e.target.value as typeof restoreMode)
              }
            >
              <option value="merge">
                Merge — keep existing personal records
              </option>
              <option value="replace">Replace this local collection</option>
            </select>
          </label>
          <p className="muted">
            First, save a backup of your current collection. Cancelling the save
            cancels the restore. Online sessions are not imported.
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setIncoming(null)}>
              Cancel
            </button>
            <button className="button primary" onClick={() => void restore()}>
              Save backup & restore
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function PlusSymbol() {
  return <span className="plus-symbol">+</span>;
}
