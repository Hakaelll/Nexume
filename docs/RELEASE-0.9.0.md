# Nexume 0.9.0

## Collection, discovery and appearance

- Keep the warm canvas, magenta identity and full-color artwork, with persistent light, dark and system themes.
- Add Spanish and English UI preferences, system language selection and an English fallback. Personal titles, reviews and notes retain their original text.
- Compact page headings, Home protagonist and profile favorites. Use the existing cinematic banner when available, three-line Grid titles with accessible complete titles, and viewport-based Collection sizing.
- Add card-aligned carousel controls with disabled boundaries and preserve native scrolling and keyboard navigation.
- Separate For you, random exploration and What fits tonight. Local affinity uses favorites, likes and ratings of at least 8/10, with real genre/studio reasons and deterministic ordering. Exclude saved and hidden titles and recover hidden proposals in Settings.
- Show local matches immediately in global search, including offline, separately from AniList results.

## Reliability and performance

- Return typed success/failure results from queued mutations. Confirm only successful persistence and retain review, profile and list drafts when saving fails.
- Show contextual starting/resuming actions and require confirmation before a rewatch resets progress.
- Centralize semantic theme and movement tokens; animate progress with scaleX and retain immediate keyboard dismissal and reduced-motion behavior.
- Deduplicate equivalent AniList requests with independent cancellation per consumer, suspend inactive recommendation work and defer the Supabase client until used.
- Remove unused font-weight imports while preserving fonts used by the public viewer. Prioritize protagonist images and stop Collection rendering after the scene settles.
- Preserve Windows/Tauri/SQLite, old backup defaults and optional sharing privacy. No installer publication or automatic installation.

## Verification

TypeScript, ESLint, unit/integration tests, relevant automated Edge tests, Rust tests and the NSIS native build are recorded for this release. See [performance results](PERFORMANCE-0.9.0.md). Automated tests cover failed saves, draft retention, rewatch confirmation, themes/languages, offline search, focus restoration, long titles, desktop sizes, a 200% zoom reflow equivalent, and large collections.

The controlled benchmark does not fully meet the requested 10% limit: opening a detail with 100 titles adds approximately 8.3 ms (+17.1%); other recorded medians remain within the limit.

The user requested no Computer Use and will check the Windows installer visually. WebView2 visual approval and a native frame-time comparison remain pending that review.
