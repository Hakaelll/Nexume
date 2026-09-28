# Performance review — Nexume 0.8.1

Completed 2026-09-16. Scope: artwork loading, a library of about 500 titles,
screen transitions, long scrolling sessions, and local persistence.

## Implemented changes

- **Bounded grid rendering:** distant cards keep lightweight, searchable title
  placeholders. Full controls and subscriptions mount near the viewport and
  unmount when distant. Focused cards, pending actions, feedback, and open rating
  editors stay mounted. Shared observers handle card visibility and lazy artwork;
  images request asynchronous decoding. Artwork resolution is unchanged.
- **Stable rendering:** library cards and navigation callbacks are memoized.
  Sorting runs only when entries or filter/sort fields change. Saving indicators
  subscribe separately from the app shell. Expensive views use narrower store
  subscriptions. Statistics aggregates diary activity once by local month.
- **Immutable validation:** only objects validated by the corresponding schema
  are cached, and those outputs are deeply frozen. Unchanged entries and arrays
  retain their references. Changed/imported data and cross-record constraints
  are still validated. Saves reuse validated snapshots; browser previews cache
  parsed state while detecting external storage changes and failed writes.
- **Incremental SQLite saves:** stage incoming arrays and reconcile rows in one
  transaction. Insert/update only changed records and delete removed records.
  List reordering and identity changes during restore preserve referential
  integrity. Array order is saved in a separate preferences record, avoiding
  position updates to every row on insertion. Old databases without that record
  still load; existing data tables and backup formats remain valid.
- **Artwork cache:** limit native image operations to four and deduplicate pending
  URLs independently of the completed cache. Native downloads reuse one HTTP
  connection pool. A lazily initialized index replaces per-download directory
  scans. Atomic publication and eviction share a lock, protect the newest image,
  ignore in-flight temporary files, and maintain the 256 MiB image budget.
- **Preference and graphics work:** coalesce queued preference writes while
  preserving mutation ordering and concurrent edits. Skip unchanged mutations.
  Compute 3D diagnostics only when enabled. Cancel scroll timers on unmount.

## Measured results

Compared with an isolated checkout of `5a7ecfc` using the same dependencies:
Edge, 1440 × 1000, 500 generated titles, local demo artwork, reduced motion,
and a Vite development server.

| Grid measurement | Original code | Final verification |
| --- | ---: | ---: |
| Full cards mounted initially | 500 | 10 |
| Initial descendant DOM elements | 38,490 | 7,630 |
| Navigation until first visible image decoded | 3,193 ms | 1,251 ms |
| Peak full cards during the complete grid sweep | 500 | 15 |

Initial complete card mounts fell 98% and DOM elements about 80%. The final
loading sample was about 61% shorter. These are local, illustrative measurements,
not production latency guarantees; timings include test polling. The earlier
intermediate build measured 1,225–1,323 ms on the same scenario.

SQLite audit triggers verify that changing progress in a 500-title snapshot
updates exactly one persistent `library_entries` row; resaving an identical
snapshot performs zero persistent row writes. Temporary staging work still
scales with snapshot size. Tests cover rating removal, reviews, deletion,
list ordering, identity swaps, duplicate rejection, and rollback.

## Verification and reproduction

- 66 TypeScript unit tests, including immutable validation, cross-record
  constraints, native order/legacy loading, preferences, and cache failures.
- 7 Rust tests for persistence, constraints, and indexed cache behavior.
- 17 selected Edge tests covering long scrolling, pinned editors, focus,
  navigation, actions, backups, lists, profile, recommendations, and 3D resource
  bounds through 1,000 titles.
- TypeScript, ESLint, Rust formatting, and production frontend/native build.

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
cargo test --manifest-path src-tauri/Cargo.toml --lib
node node_modules/@playwright/test/cli.js test tests/e2e/library-performance.spec.ts tests/e2e/app.spec.ts tests/e2e/cinema.spec.ts tests/e2e/backup.spec.ts tests/e2e/gallery.spec.ts tests/e2e/performance.spec.ts
node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis
```

The grid test writes `test-results/library-performance.json`. Two old browser
expectations now reflect existing 0.8.0 behavior: four ongoing sample titles on
Home and six matching tonight candidates. Scrolling tests target stable slots
and verify visible artwork instead of requiring distant images to stay mounted.

## Scope and limits

Lightweight placeholders preserve titles, natural layout, and keyboard access;
heavy content is bounded, but the total DOM is not fixed-size. Full snapshots
still cross IPC and undergo cross-record validation, so very large histories
can cost additional work. Cache tests use temporary directories and SQLite
tests isolated databases. The user's collection was not modified. Real network
latency, WebView2 sessions, and installation over the user's application were
not measured. The installer is built, not installed automatically.
