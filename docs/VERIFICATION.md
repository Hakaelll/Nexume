# Verification record

Observed on September 9, 2026. A build or an automated test is not proof of every manual/hardware scenario.

## Completed checks

- `npm run lint` and `npm run typecheck` passed on the current source.
- `npm run test`: 29 tests passed across domain/backup/list invariants, AniList mapping/retries/cancellation/cache/outage behavior, public serialization/queue reconciliation and actual PostgreSQL RLS/RPC execution with PGlite.
- `cargo fmt --check`, `cargo clippy --all-targets` and three Rust tests passed again on the current native source.
- The complete Playwright suite passed: **8/8** in 43.3 seconds after the visual refinement; the personal workflow passed once more after removing the last filler labels. It covers personal records and reviews, lists/profile, offline persistence, controlled GraphQL search/add/failure, backup/restore, desktop viewport sizes, reduced motion, WebGL loss and 10/100/500/1000-title collections.
- The viewport test exercised 1920x1080, 2560x1440, 3440x1440 and 960x640. This is browser sizing evidence, not physical multi-monitor validation.
- The refreshed Windows executable and NSIS installer were built at 22:28 on September 9, 2026. They contain the final functional changes; subsequent source formatting is nonfunctional. Copies are in `release/` and hashes are recorded in `release/SHA256SUMS.txt`.
- The refreshed native executable opened successfully and displayed the local profile UI. After the user authorized continued interaction, the sample collection saved successfully through the native SQLite path and Collection displayed its actual textures.

The earlier final-suite approval allowance block was resolved after its stated reset time. The subsequent test run was explicitly authorized. An erroneous substring assertion that matched `0 cases` inside `10 cases` was corrected. A development hot reload during formatting interrupted one initial workflow; the stable-source rerun passed all eight tests.

## Performance evidence

Machine renderer: Intel Iris Xe Graphics, ANGLE Direct3D11, Microsoft Edge, 1440x1000 viewport, High graphics setting. Fixture titles reuse 12 local artwork files and include missing-cover cases; this does not simulate 1000 distinct downloaded images. Each sample records 55 measured frame intervals after discarding five initial intervals. This is a short sample, not a sustained benchmark.

| Library size | Active cases | Mean frame interval | p95 interval | Reported heap |
|---|---:|---:|---:|---:|
| 10 | 10 | 16.69 ms | 16.80 ms | 21 MB |
| 100 | 21 | 16.68 ms | 16.90 ms | 25 MB |
| 500 | 21 | 16.68 ms | 16.80 ms | 29 MB |
| 1000 | 21 | 16.69 ms | 16.90 ms | 31 MB |

Raw observations: `docs/evidence/performance-2026-09-09.json`. Heap is browser-provided and texture memory is an estimate from cache entries, not total GPU VRAM. The diagnostic instantaneous frame interval for the 10-title case captured a transient 66.7 ms value; its later measurement window is shown above. Physical display removal and sustained GPU/unique-cover stress remain unverified.

## External limits

The real AniList GraphQL endpoint returned HTTP 403 with: “The AniList API has been temporarily disabled due to severe stability issues.” Live search/add cannot be declared verified until service resumes. The application reports the failure and keeps the local collection usable.

No user-controlled Supabase project or deployed public viewer was configured. PostgreSQL/RLS/public DTO tests are local evidence. Real account authentication, publication, private removal and hosted public URLs require that configuration to verify end to end.

## Remaining native checks

SQL-plugin writes were observed. Reload, native export/restore dialogs, window resize/maximize/restoration and physical monitor-removal behavior need recorded interaction results. Native startup has been observed. See NEXT_TODOS.md for pending work and README.md for reproduction commands.
## September 10, 2026 — Nexume 0.2.0

The 0.2.0 interface adds a 54px searchable header, Watchlist, filtered animated random recommendations and a redesigned Statistics page. The full browser suite passed **10/10 in 52.0 seconds**. It covers the new flows, persisted Watchlist records, Start watching, combined recommendation filters, empty results, filter-change cancellation, reduced-motion reveal, header search, chart values and 6/12-month range selection, as well as all eight existing workflows. A second chart test seeds an explicitly synthetic local diary to verify populated chart values. Its screenshot is test evidence, not user viewing history.

TypeScript and ESLint passed. The unit/API/database/privacy/recommendation suite passed **33/33**. Four recommendation tests cover combined filters, missing metadata, adult-content preference, deduplication, empty/singleton pools and selection without immediate repeats. The frontend production build passed. Native packaging status is updated below when the build finishes.

Updated screenshots: docs/evidence/recommendation.png, watchlist.png, statistics-populated.png, home-empty.png and library-grid.png. Updated short frame samples: docs/evidence/performance-2026-09-10.json. The same hardware and repeated-artwork limitations described above apply. Transient frame spikes during loading are present; the measurements do not claim sustained 60 FPS on every device.
The 0.2.0 Windows release completed successfully at 12:16 on September 10, 2026. Final deliverables are release/Nexume-0.2.0-windows-x64-setup.exe and release/Nexume-0.2.0-windows-x64.exe, with SHA256SUMS-0.2.0.txt. The executable launched successfully and loaded the existing 13-entry native collection with the new header, Watchlist and Recommend navigation. User changes in that existing collection were preserved. No new installer installation or hosted cloud publication is claimed.
The native 0.2.0 Recommend page loaded its 13-entry library candidate pool, ran the Choosing animation and revealed a result with its artwork. This was a read-only recommendation; no personal entry was added or changed during the native check.


## 0.2.1 interface refinement — 2026-09-10

- Fixed Library results padding/stacking, opaque sticky headers and separated table borders.
- Added live header typeahead with local partial-title matches, remote debounce/cancellation, covers and keyboard selection.
- Refined Discover cards, visible complete titles, Watchlist actions, native image fallbacks and stale request guards.
- Added content-only browser view transitions with reduced-motion handling.
- TypeScript and ESLint pass; 33 unit/integration tests and all 12 Playwright tests pass.
- New screenshots reviewed: header-typeahead.png, discover-refined.png and library-list-scrolled.png in docs/evidence.
- Discover rendering tests use 12 real-title fixtures with bundled artwork, not live catalog results.
- A separate live AniList request returned HTTP 403 with its temporary API shutdown message. Live catalog availability remains externally blocked.
- Native app before update contained 14 entries and one list; closed via Alt+F4 before packaging. No collection entries were edited for these checks.

- Windows release build completed successfully in 3m 28s. Installer: 5,192,192 bytes; standalone executable: 11,958,272 bytes. Hashes are in release/SHA256SUMS-0.2.1.txt.
- Launched the rebuilt native executable. Profile still shows 14 anime and one list. Typing `cow` in the native header immediately displayed Cowboy Bebop without submitting the search.

- Follow-up native observation changes the scope of the API finding: the WebView returned additional online results for `cow` (The Satellite Girl and Milk Cow, My Milk Cup Cow and Cow's Day), with all four suggestion covers visible. The HTTP 403 was specific to the external Node probe; it is not proof of a universal outage.
- Native Discover also loaded the live Trending catalog successfully. Visible cards include Re:ZERO Season 4, Saga of Tanya the Evil Season 2, ONE PIECE and other current results, with real covers, full titles and aligned Watchlist actions. This supersedes the earlier statement that live catalog availability was blocked in the app.


### Native backup dialog verification — 0.2.1

Exported a backup through the actual Windows Save As dialog to an ignored
local release path. The file is 50,524 bytes and declares backupVersion 1.
Reopened it through the native Open dialog: Nexume displayed its validated
restore preview with 14 anime, 0 reviews, 1 list and 9 diary events. Closed
the preview with Escape without applying merge or replacement. This verifies
native file export, native file selection/read, preview validation and cancel;
it does not claim to exercise native replacement of the user's collection.
The backup contains personal data and remains excluded from Git by release/.

Observed UX follow-up: the first Save As dialog inherited the launcher working
directory (Program Files/WindowsApps). A sensible initial user-document folder
should be selected by the native export adapter. The next Open dialog correctly
remembered the folder used for export.
