# Nexume 0.9.0 verification

Verified on 2026-10-08 using Windows development tools and automated Microsoft Edge tests. Computer Use was not used for this release pass, as requested by the user.

## Passing checks

- TypeScript: `tsc --noEmit`.
- ESLint: full repository check.
- Vitest: 72 tests across 14 files, including database validation, PostgreSQL ownership/privacy, typed failed saves, deterministic local affinity and independent request cancellation.
- Rust: 7 tests, including SQLite constraints, atomic failed restore, incremental persistence and bounded image-cache work.
- 27 distinct relevant Edge E2E scenarios across the integrated and final targeted runs. Coverage includes collection management, searches, backups, saved reviews, profile/lists, failure feedback, draft retention, confirmed rewatch, retained focus/scroll, season imports, hidden-page activity, recommendation context changes, themes/languages and offline local search.
- Layout reflow checks at 960×640, 1440×1000 and 1920×1080, plus a 480×320 CSS viewport equivalent to 200% zoom on the minimum desktop size. Long titles retain complete accessible text.
- Collection resource and idle checks with 10, 100, 500 and 1,000 titles; 500-title Grid deferred mounting and focus recovery.
- Impeccable detector: no findings on the new semantic tokens, responsive refinement layer and primary changed surfaces.

## Review limits

The reflow test is a CSS viewport equivalent, not a direct WebView2 zoom operation. The user will inspect the packaged installer for native visual correctness, dark surfaces and animations. Native visual approval and a native GPU/frame-time comparison are pending that review.

See [performance methodology](PERFORMANCE-0.9.0.md) and [release notes](RELEASE-0.9.0.md).
