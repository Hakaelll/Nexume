# Nexume

**Your anime, remembered.** A Windows 10/11 anime library built with Tauri 2, Rust, React, TypeScript, SQLite and Three.js. Personal data stays on your computer. No account, subscription, external AI or cloud service is required.

Nexume has a true WebGL Collection view, a practical Grid and a configurable List. Track episodes, rate in half stars, keep independent likes and favorites, write quick thoughts and spoiler-aware reviews, curate ranked lists, choose six profile favorites and revisit your diary and statistics.

## Try it

Ready-to-try copies are in `release/`:

- `Nexume-0.2.1-windows-x64-setup.exe`: Windows installer.
- `Nexume-0.2.1-windows-x64.exe`: executable without installation.
- `SHA256SUMS-0.2.1.txt`: package hashes.

Build outputs are also generated under `src-tauri/target/release/`:

- `nexume.exe`: standalone application executable. Requires Microsoft Edge WebView2 Runtime.
- `bundle/nsis/Nexume_0.2.1_x64-setup.exe`: per-user installer, with English and Spanish installer UI. Application UI is English.

See `docs/VERIFICATION.md` for which source revision and checks each package represents. A development build is unsigned; no certificate or automatic updater is configured.

Start with **Search anime**, or choose **Try a sample** on Home. Sample data is explicitly opt-in and tagged `sample`; it contains illustrative progress, ratings and thoughts. Existing library records are kept. Settings also exposes the sample loader.

**AniList availability:** during implementation on September 9, 2026, the live GraphQL endpoint returned HTTP 403 with an explicit temporary-disablement message. Nexume surfaces upstream failures and keeps all local features usable. Successful search/add is covered with controlled GraphQL responses; that is not evidence that the live upstream outage has ended. On September 10, the packaged 0.2.1 WebView successfully loaded live search suggestions and Discover covers, while the external Node probe still received 403.

## Development

Install Node.js 22.18+ (Node 24 recommended), the stable Rust MSVC toolchain, Visual Studio C++ Build Tools, Windows SDK and WebView2. Use the checked-in pnpm lockfile for exact dependency versions:

```powershell
corepack pnpm install --frozen-lockfile
npm run dev
npm run tauri dev
```

The browser preview at `http://127.0.0.1:1420` stores data in this browser. The Windows application uses SQLite. **Their collections are separate.** JSON backups can transfer your records between them.

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run tauri build
cd src-tauri
cargo fmt --check
cargo clippy --all-targets
cargo test
```

Playwright tests use installed Microsoft Edge. They run against the local application, without creating cloud accounts or publishing user data. The PostgreSQL privacy tests use PGlite locally and apply the actual Supabase schema.

## Local data and backups

The native database is `nexume.db` under the application configuration directory (`%APPDATA%/app.nexume.desktop` on Windows). Artwork is cached separately under the application cache directory. Window placement is managed by Tauri's window-state plugin. A second application launch focuses the existing window to avoid competing writers.

Settings exports a versioned JSON backup or a formula-safe CSV. Restore validates fields, IDs and relationships, shows a summary, and offers merge or replacement. It asks you to save a pre-restore backup before proceeding. Merge preserves existing personal records. Online sessions, publication ownership and pending uploads are excluded from exported backups; a restored copy does not automatically publish anything. Remote publications are not part of local backup restoration.

The application never silently resets an unreadable database. A failed save reports an error and retains the previously committed state.

## Optional online sharing

1. Create your own Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_PUBLIC_VIEWER_URL`.
3. Set the viewer URL to your actual HTTPS URL, such as `https://your-host.example/viewer.html`. No Nexume domain is assumed.
4. Build the application. Deploy the contents of `dist/` to a static host of your choice; `viewer.html` is its public entry. The same environment values must be present at build time.
5. Sign in from Settings. Set the intended list/profile/review visibility and explicitly publish it. Future edits to that opted-in publication enter the durable local queue. Switching it to Private or deleting it queues remote removal.

Only an anon/publishable key belongs in the frontend. Never put service-role or administrative secrets there. Private notes, internal record IDs, device paths and viewing history are excluded from public DTOs. Quick thoughts in lists require explicit opt-in. The viewer has no dependency on the desktop store, repository or native bridge, and does not persist an authentication session.

Public and Unlisted snapshots are readable only through an ID-specific RPC. Anonymous visitors cannot enumerate the backing table. Publishing is owner-scoped, versioned and protected against stale writes. Unlisted means accessible to someone with the link; it is not password protection. Without configuration, sharing says **Not configured** and local Lists/Profile remain available.

## Watchlist, recommendations and statistics

New anime added through Search or a detail page enter **Watchlist** (Planning). Use **Start watching** to move the same record into Watching; search, genre and priority controls help organize upcoming titles.

**Recommend** chooses a random anime from Watchlist, Library, AniList popular results or the explicitly labeled offline sample catalog. Combine genre, format, earliest year and maximum episodes, then select **Pick an anime**. The result can be opened or added to Watchlist. This is a random selection from the displayed candidate pool, not an AI prediction or a uniform sample of the full AniList database.

**Statistics** includes a status donut, monthly activity, half-star histogram and genre/studio/decade/season charts. The compact header accepts a search query directly. Tab and recommendation animations respect reduced motion.

## Keyboard and mouse

| Input | Action |
|---|---|
| Ctrl+K | Global AniList search |
| Ctrl+L / Ctrl+H / Ctrl+, | Library / Home / Settings |
| Arrow keys in Collection | Select adjacent anime |
| Enter / Space | Detail / Quick view |
| Escape | Back or close an overlay |
| F / R | Like selected anime / focus or open rating |
| Click / double click in Collection | Select / open |
| Wheel over Collection | Move selection |
| Right click an anime | Context actions |

The rating control also supports arrow keys, Home/End and Delete to clear. Ranked lists support drag-and-drop and keyboard-accessible move buttons. Grid and List provide alternatives to WebGL. Reduced motion respects both system and application settings.

## Documentation

`ARCHITECTURE.md`, `DATABASE.md`, `DESIGN.md`, `COLLECTION_3D.md`, `SOCIAL_ARCHITECTURE.md`, `MOBILE_PORT_PLAN.md`, `NEXT_TODOS.md` and `docs/VERIFICATION.md` describe the implementation and remaining verification. `docs/COMMIT_MESSAGE.txt` contains the detailed English commit message.

The original design reference is preserved in `docs/ACTIVE_THEORY_REFERENCE.md`. Nexume uses the supplied emblem; no Sony/PlayStation assets or proprietary fonts are included. See `docs/ASSETS.md` for artwork and font attribution. Android/iOS implementation is intentionally deferred.
