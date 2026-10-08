import { t, useLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
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
import { version } from "../../../package.json";
export default function Settings({ onSample }: { onSample: () => void }) {
  useLanguage();
  const store = useApp(
    useShallow((state) => ({
      data: state.data,
      prefs: state.prefs,
      mutate: state.mutate,
      add: state.add,
      addMany: state.addMany,
      edit: state.edit,
      remove: state.remove,
      episodes: state.episodes,
      adjustEpisodes: state.adjustEpisodes,
      complete: state.complete,
      rewatch: state.rewatch,
      notify: state.notify,
    })),
  );
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
      const result = await store.mutate((d) =>
        restoreMode === "merge"
          ? mergeBackup(d, incoming)
          : {
              ...incoming,
              queue: [],
              preferences: { ...incoming.preferences, publications: [] },
            },
      );
      if (result.ok) {
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
      const result = await store.mutate((d) => ({
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
      if (result.ok) store.notify(`Refreshed ${metadata.length} titles.`);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page settings-page">
      <PageTitle title={t("Settings")} />
      <section className="settings-section">
        <div>
          <h2>{t("Collection & display")}</h2>
        </div>
        <div className="settings-controls">
          <label className="setting-row">
            <span>{t("Theme")}</span>
            <select
              aria-label={t("Theme")}
              value={p.theme}
              onChange={(e) =>
                void store.prefs({ theme: e.target.value as typeof p.theme })
              }
            >
              <option value="light">{t("Light")}</option>
              <option value="dark">{t("Dark")}</option>
              <option value="system">{t("System")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("Language")}</span>
            <select
              aria-label={t("Language")}
              value={p.language}
              onChange={(e) =>
                void store.prefs({
                  language: e.target.value as typeof p.language,
                })
              }
            >
              <option value="system">{t("System")}</option>
              <option value="es">{t("Español")}</option>
              <option value="en">{t("English")}</option>
            </select>
          </label>
          <div className="setting-row">
            <span>
              {t("Hidden recommendations")}{" "}
              <small>{p.hiddenRecommendations.length}</small>
            </span>
            <button
              className="button"
              disabled={!p.hiddenRecommendations.length}
              onClick={() => void store.prefs({ hiddenRecommendations: [] })}
            >
              {t("Restore recommendations")}
            </button>
          </div>
          <label className="setting-row">
            <span>{t("Graphics quality")}</span>
            <select
              value={p.quality}
              onChange={(e) =>
                void store.prefs({
                  quality: e.target.value as typeof p.quality,
                })
              }
            >
              {["High", "Balanced", "Low"].map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>
              {" "}
              {t("Animations")}{" "}
              <small>
                {" "}
                {t(
                  "Full animations also work when Windows reduces motion.",
                )}{" "}
              </small>
            </span>
            <select
              aria-label={t("Animations")}
              value={p.reducedMotion ? "reduced" : p.motionMode}
              onChange={(e) =>
                void store.prefs({
                  motionMode: e.target.value as typeof p.motionMode,
                  reducedMotion: false,
                })
              }
            >
              <option value="system">{t("Follow system")}</option>
              <option value="full">{t("Full animations")}</option>
              <option value="reduced">{t("Reduced motion")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>
              {" "}
              {t("Graphics diagnostics")}{" "}
              <small>{t("Frame time, draw calls and active resources.")}</small>
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
            <span>{t("Include adult anime in online results")}</span>
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
          <h2>{t("Data & backups")}</h2>
          <p>
            {native
              ? t("Saved on this computer.")
              : t(
                  "Browser preview · stored in this browser, separately from the Windows app.",
                )}
          </p>
        </div>
        <div className="settings-controls">
          <button className="setting-action" onClick={() => void backup()}>
            <Download size={18} />
            <span>
              {" "}
              {t("Export Nexume backup")}{" "}
              <small>
                {t("Library, ratings, reviews, lists and profile.")}
              </small>
            </span>
          </button>
          <button className="setting-action" onClick={() => void load()}>
            <Upload size={18} />
            <span>
              {" "}
              {t("Restore a backup")}{" "}
              <small>
                {t("Preview its contents before merging or replacing.")}
              </small>
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
              {" "}
              {t("Export library as CSV")}
              <small>{t("Portable tabular data.")}</small>
            </span>
          </button>
          <button
            className="setting-action"
            disabled={busy || !navigator.onLine || !store.data.entries.length}
            onClick={() => void refresh()}
          >
            <RefreshCw size={18} />
            <span>
              {" "}
              {t("Refresh cached metadata")}{" "}
              <small>
                {" "}
                {t(
                  "Updates artwork and schedules without changing your opinions.",
                )}{" "}
              </small>
            </span>
          </button>
          <button className="setting-action" onClick={onSample}>
            <PlusSymbol />
            <span>
              {" "}
              {t("Load a sample collection")}{" "}
              <small>{t("Optional sample records for trying the app.")}</small>
            </span>
          </button>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>{t("Sharing")}</h2>
        </div>
        <div className="settings-controls">
          {!social.configured ? (
            <div className="configuration-note">
              <h3>{t("Online sharing: Not configured")}</h3>
              <details>
                <summary>{t("Setup")}</summary>
                <p>
                  {" "}
                  {t(
                    "Configure Supabase and a public viewer URL as described in README.md.",
                  )}{" "}
                </p>
              </details>
            </div>
          ) : identity ? (
            <>
              <p>
                <Check size={14} /> {t("Signed in as")} {identity.email}
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
                <LogOut size={15} /> {t("Sign out")}{" "}
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
                {" "}
                {t("Email")}{" "}
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                {" "}
                {t("Password")}{" "}
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
                  {" "}
                  {t("Create account")}{" "}
                </button>
                <button className="button primary" disabled={busy}>
                  {" "}
                  {t("Sign in")}{" "}
                </button>
              </div>
            </form>
          )}
          {message && <p role="status">{message}</p>}
          {store.data.queue.length > 0 && (
            <div className="sync-status">
              <h3>
                {store.data.queue.length} {t("pending updates")}
              </h3>
              {store.data.queue.map((q) => (
                <p key={q.id}>
                  {q.kind} · {q.attempts} {t("attempts")}{" "}
                  {q.error && <small>{q.error}</small>}
                </p>
              ))}
              <button
                className="button"
                disabled={!navigator.onLine || !identity}
                onClick={() => void flushQueue(true)}
              >
                {" "}
                {t("Retry pending sync")}{" "}
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>{t("Keyboard shortcuts")}</h2>
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
            {" "}
            {t("Nexume")} <small>{version}</small>
          </h2>
          <span>{t("Metadata by AniList")}</span>
        </div>
      </footer>
      {incoming && (
        <Modal
          title={t("Restore your collection")}
          onClose={() => setIncoming(null)}
        >
          <p className="prose">
            {" "}
            {t("This backup contains")} {incoming.entries.length} {t("anime,")}{" "}
            {incoming.entries.filter((e) => e.review).length} {t("reviews,")}{" "}
            {incoming.lists.length} {t("lists and")} {incoming.history.length}{" "}
            {t("diary events.")}{" "}
          </p>
          <label className="field">
            {" "}
            {t("Restore method")}{" "}
            <select
              value={restoreMode}
              onChange={(e) =>
                setRestoreMode(e.target.value as typeof restoreMode)
              }
            >
              <option value="merge">
                {" "}
                {t("Merge — keep existing personal records")}{" "}
              </option>
              <option value="replace">
                {t("Replace this local collection")}
              </option>
            </select>
          </label>
          <p className="muted">
            {" "}
            {t(
              "First, save a backup of your current collection. Cancelling the save cancels the restore. Online sessions are not imported.",
            )}{" "}
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setIncoming(null)}>
              {" "}
              {t("Cancel")}{" "}
            </button>
            <button className="button primary" onClick={() => void restore()}>
              {" "}
              {t("Save backup & restore")}{" "}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function PlusSymbol() {
  useLanguage();
  return <span className="plus-symbol">+</span>;
}
