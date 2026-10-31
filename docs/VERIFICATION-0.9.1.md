# Nexume 0.9.1 verification

## Executed checks

- ESLint and TypeScript pass.
- Vitest passes 72 tests across 14 files.
- Rust passes all 7 library tests, including atomic restore, incremental SQLite saves and bounded image-cache work.
- The production frontend and Windows x64 NSIS installer build successfully. The generated executable reports product and file version 0.9.1.
- Automated Edge checks verify 57 distinct interface scenarios across the full run and the targeted fixture rerun. The older opt-in comparison test is skipped; the QHD comparison has its own script.

The full browser run initially passed 54 scenarios and exposed three outdated expectations. The corrected fixtures fix the calendar date to midmonth, use an explicit 24-hour locale for Los Angeles time, and retain the local alias match in search. All four scenarios in the two affected files pass on rerun. These changes do not change application behavior.

## Visual and interaction coverage

The same sample-data fixture runs in light and dark themes at 2560×1440, 1920×1080, 1440×1000 and 960×640. Checks cover all navigation destinations, Library Grid, List and Collection, weekly and monthly calendars, anime details and the review dialog. Separate captures cover empty, loading and recoverable error states, Spanish labels and profile dialogs.

Geometry checks verify the common workspace edges, header-search alignment, horizontal overflow, the 760px scene limit and separation of the canvas from its heading and controls. Images visible in the viewport decode before the final captures.

Before and after at 2560×1440 with the same dark-calendar fixture:

- [Before](evidence/qhd-0.9.1-calendar-before.png)
- [After](evidence/qhd-0.9.1-calendar-after.png)

Tests verify fewer than 100 complete Home and Watchlist cards with 100, 500 and 1,000 entries. Distant titles remain accessible. Scrolling to a distant card, opening and returning from its detail, restoring focus and saving progress or priority all pass. A separate completed-tracking test proves that loading the real card preserves the placeholder's height.

The dark progress regression initially measured only 1.012:1 contrast between fill and track. The corrected fill passes the 3:1 assertion. Additional tests check native dark controls, selected navigation icons, text on magenta, system-theme changes and ordered blur-plus-increment actions. The latter uses browser persistence; it does not simulate native disk latency.

Existing tests cover failed writes and retained drafts, offline local search, rating editors, backups, uploaded avatars, reduced motion and persistent navigation state. Collection resource checks retain the existing case and texture limits through 1,000 entries and verify an unchanged renderer frame counter at idle.

## Reproduction

Run the production checks from the repository root in PowerShell:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
cargo test --manifest-path src-tauri/Cargo.toml --lib
node node_modules/vite/bin/vite.js build --configLoader native
$env:NEXUME_E2E_PREVIEW='1'
node node_modules/@playwright/test/cli.js test --trace=off
node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis
```

The QHD tests save screenshots in their Playwright output directory. The performance script and its baseline requirements are recorded in [the performance report](PERFORMANCE-0.9.1.md).

## Limits

Browser runs use isolated preview storage and local demo covers. They do not read or change the installed collection. Computer Use and native installation were not performed. Native WebView2 visual approval and GPU timings on the user's monitor remain pending.

The Impeccable detector reports twelve typography warnings for the preserved project fonts and one pre-existing histogram height-transition warning. The approved typography remains authoritative. The histogram transition was not changed or benchmarked in this pass.
