# Verification · 0.6.1 profile framing and Spanish time

September 12, 2026.

- Final Tauri/NSIS 0.6.1 build succeeded. Both release files were scanned without execution using Defender definitions 1.459.166.0; both explicitly reported no threats. SHA-256 hashes are in release/SHA256SUMS-0.6.1.txt. This local result does not resolve the detection on the other Windows 10 computer.

- TypeScript and ESLint passed; Vitest: **43/43 passed**.
- Full production regression run: 19 tests passed; one old avatar-preview selector failed because the editor now uses a full-image canvas. Updated that selector and reran the remaining test successfully (1/1), including saved-avatar persistence after reload. All 20 scenarios are verified.
- Three targeted production browser tests passed: visual avatar crop with pointer dragging, arrow keys and zoom; favorite search/selection and save; calendar/discovery regressions; full-motion override; Spain's Home schedule with a browser configured for America/Los_Angeles.
- Unit coverage verifies summer/winter hours, a Spanish date differing from UTC, and 23/25-hour daylight-saving days.
- Visually inspected the full-photo crop editor at 960×640. The image, selection circle and zoom fit within the scrollable dialog without overlap. Updated docs/images/avatar-crop.png and home-today.png.
- Reported 0.6.0 Defender detection occurred on a separate Windows 10 computer. Local scans did not reproduce it; see [investigation](DEFENDER-0.6.0.md). This is not a confirmed false positive or a fixed malware detection.
- No changes to rating behavior, database schema or antivirus exclusions. No native installation or testing on the affected Windows 10 computer was performed.

---

# Verification · 0.6.0 personal workspace

September 12, 2026.

- Tauri Windows x64 and NSIS packaging succeeded. Executable, installer and SHA-256 hashes are available in `release/` under version 0.6.0.

- TypeScript and ESLint passed. Vitest: **40/40 passed**.
- Final production Playwright suite: **19/19 passed** in 2.0 minutes.
- Motion regression: emulate an OS requesting reduced motion, choose Full animations, reload to verify persistence, run a visible roulette, then switch back to Reduced motion. A shared hook supplies the effective preference to Collection, Recommend and navigation; CSS uses the same root state.
- The previous implementation combined the app checkbox with the Windows media preference and unconditionally disabled CSS animations under that media query. Full mode now overrides that path. The other physical computer was not available for direct inspection; this is verified with browser media emulation, not a claim of testing its GPU/WebView installation.
- Calendar tests cover Monday-based weeks crossing a year boundary, a six-row month, a complete local day, next-month navigation and Today. Provider tests verify airing pagination, inclusive start boundaries and per-occurrence episode metadata.
- Profile tests cover favorite search/selection, a cropped upload with zoom/position adjustment, saving and existing avatar persistence. No rating behavior was changed; the abandoned star-regression test was removed following the user's correction.
- Discover tests verify server filter variables for an 80/100 minimum score and at most 12 episodes. The old search test is scoped to the search dialog because Home now also shows catalog cards.
- Existing library, diary, rating, review, lists, backup, profile and quick-action tests remain passing; bounded Collection resource tests cover up to 1,000 titles.
- Layout checks cover all 11 sections at 960×640 and 1440×1000. Screenshots of populated Home, Diary, month view and crop controls are saved in docs/images.
- AniList responses in tests are controlled fixtures. Schedule fields were checked against https://docs.anilist.co/reference/object/page. Live schedules depend on provider availability; known local upcoming dates remain available offline.
- Preferences add motionMode with backward-compatible defaults. No database migration, installation over the user's app, commit, push or release publication was performed during this task.

---

# Verification · 0.5.2 artwork quality

September 11, 2026.

- Final Tauri/NSIS build succeeded after the additional background integration. Windows 0.5.2 executable, installer and SHA-256 hashes are in `release/`.

- TypeScript and ESLint passed. Vitest: **37/37 passed**, including new tests for original-resolution artwork, old saved metadata, custom/local cover preservation and missing extraLarge fallback.
- Six production browser regression tests passed for library/detail workflows, quick actions, recommendations, profile persistence and desktop collection sizing. The detail test also verifies 24-pixel stars and a working 3.5-star click.
- The four affected browser tests passed again after the final CSS adjustments (32.4 seconds).
- Final portrait fallback integration uses a progressive horizontal mask and lower fade, removing the visible image edge without adding blur. Four affected browser tests passed again (29.6 seconds).
- A final visual pass refined the contained poster's edge mask and reduced rating-row spacing after reviewing screenshots at 960 and 1440 pixels.
- Remote artwork files are not modified or regenerated. Source detail remains limited by the images available from the provider; local demo covers are preserved for offline use.
- Database contents are unchanged. Image selection is applied at render time for existing entries and at mapping time for newly fetched metadata.
- No interactive native WebView2 smoke test or installation over the user's app was performed.

---

# Verification · 0.5.1 refinements

September 11, 2026.

- Tauri Windows x64 and NSIS packaging succeeded. Release artifacts: `release/Nexume-0.5.1-windows-x64.exe`, `release/Nexume-0.5.1-windows-x64-setup.exe` and `release/SHA256SUMS-0.5.1.txt`.

- TypeScript and ESLint passed; Vitest: **35/35 passed**.
- Final production browser suite: **17/17 passed** in 1.6 minutes.
- Added coverage for catalog relevance despite a saved title alias, SEARCH_MATCH variables, collection control insets, banner visibility, roulette outcome consistency and a profile-photo upload that survives reload.
- Existing tests still cover ratings, likes, episode tracking, reviews, lists, backups, filter-change cancellation, reduced motion, keyboard search, all 11 sections at 960×640 and 1440×1000, and bounded WebGL resources through 1,000 entries.
- The online roulette test now allows ten seconds for both the provider's rate-limited requests and the 3.4-second animation; the initial five-second expectation expired before the reveal.
- Reviewed screenshots of the paper collection, roulette, detail headers and colored statistics. Detail selectors and episode controls were adjusted for contrast on the image background, then the production browser suite was rerun.
- AniList test responses are controlled fixtures. Live provider availability is not assumed. SEARCH_MATCH is documented at https://docs.anilist.co/reference/enum/mediasort.
- Profile photos accept JPG, PNG and WebP up to 10 MB, decode locally, center-crop to 256×256 and persist as a JPEG data URL. Remote cover validation remains unchanged. No database migration is required.
- No native interactive WebView2 smoke test, installation over the user's app, commit, push or GitHub Release publication was performed.

---

# Verification · 0.5.0 Playful

September 11, 2026. Current source and packages use Playful; Henry was superseded before delivery. Earlier entries below are historical.

- TypeScript and ESLint passed; Vitest **34/34 passed**.
- Complete Playwright suite against the production frontend: **16/16 passed**, 1.5 minutes. Coverage includes existing personal-data flows, card actions and ratings after reload, search, backups, lists, profile, reduced motion, catalog/local recommendation, desktop sizing and bounded WebGL resources.
- The layout checks visit all 11 sections at **960×640 and 1440×1000**. They check horizontal overflow, navigation boundaries, heading containment, the profile photo, modal bounds and recommendation cover/text separation.
- Reviewed screenshots of Discover, Recommend, detail, settings and compact layouts. README screenshots are in `docs/images/` and use sample data.
- A development startup stalled while Vite scanned the local package store. Restricted optimizeDeps to index.html/viewer.html and excluded .pnpm-store from watching. The development module returned HTTP 200, and the quick-action/persistence browser smoke test passed after the fix. Production tests ran on a separate preview server.
- Tauri Windows x64 and NSIS build succeeded. Executable and installer are copied to `release/Nexume-0.5.0-windows-x64.exe` and `release/Nexume-0.5.0-windows-x64-setup.exe`. Hashes: `release/SHA256SUMS-0.5.0.txt`.
- The packaged UI is the same production frontend tested above. The later Vite edit only changes dependency scanning and file watching during development.
- The installer was not installed over the user's application and no native interactive WebView2 smoke test was performed for 0.5.0. No database migration, commit or GitHub publication was performed.
- Remote catalog tests use controlled AniList responses. No claim of live AniList availability is made for this release; local library/watchlist/sample functionality is independent of it.

---
# Verification · 0.3.0 gallery revamp

September 10, 2026. This section describes the current 0.3.0 source; older records below are historical.

- TypeScript (`tsc --noEmit`) and ESLint passed.
- Vitest: **34/34 passed**, including catalog ID bounds, server filter variables and candidate pagination.
- Playwright: **14/14 passed** in 1.3 minutes. Includes quick-action persistence after reload, catalog-wide fresh draws, local filters, reduced motion, existing reviews/lists/profile workflows, backup restore, header keyboard search, desktop sizes and WebGL fallback/performance cases.
- An old image assertion assumed every card was initially on screen. The labeled sidebar adds a grid row; the test now scrolls through and verifies every lazily loaded cover before continuing. All original personal-data flows then passed.
- Visual inspection: recommendation scene and Discover quick actions, with screenshots in `docs/images/`. Sample fixtures are used in those screenshots.
- Production frontend and Tauri Windows x64 release/NSIS build passed. Package names: `release/Nexume-0.3.0-windows-x64.exe` and `release/Nexume-0.3.0-windows-x64-setup.exe`; SHA-256 hashes in `release/SHA256SUMS-0.3.0.txt`.
- The packaged source is the current working-tree implementation. No subsequent application-source edits were made after its build. No commit or GitHub release was created.
- The 0.3.0 installer has not been installed or interactively exercised through native WebView2 in this session. Browser coverage does not replace that native smoke test.
- Live external Node query to AniList returned HTTP 403 with its temporary API disablement message. Catalog behavior is verified with controlled responses, not a successful live draw. Local sources are independent of this service.

---
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

Final background integration: the portrait fallback now fills only the right
portion of the header, with a progressive horizontal mask and a lower fade.
This removes the hard edge of the contained image without adding blur.
The four affected production browser tests passed again after this final pass.
