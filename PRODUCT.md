# Nexume product context

Nexume is a private, local-first Windows anime collection application using Tauri, SQLite and AniList metadata. Collectors track episodes, rate anime, write reviews and private notes, organize lists and choose what to watch next. Core tasks require no account. Optional social publication remains explicit.

The October 2026 improvement brief preserves the six supplied screenshots as visual authority: warm canvas, magenta identity, italic display headings, full-color artwork, Home protagonist, Collection thumbnails and cinematic detail banner. Improve density and responsiveness while retaining the identity.

## Requirements

- Success follows durable persistence. Failed writes retain existing data and open form drafts. Mutations return a typed result and remain serialized.
- Starting, resuming and rewatching are distinct. Resetting progress requires confirmation.
- Light is the initial theme; dark and system are persistent options. Language follows the system, with Spanish supported and English as fallback. Personal titles and writing are never translated.
- For you ranks local affinity from favorites, likes and ratings of at least 8/10. New proposals exclude saved, hidden and disallowed adult titles; ties are deterministic. Hidden IDs can be restored in Settings.
- What fits tonight retains the existing duration and aired-episode evaluator. Random discovery remains a separate mode.
- Search shows local matches immediately, including offline. AniList results are identified separately.
- Preserve Windows, existing backups, local storage and privacy. No new platforms, paid AI, account synchronization or automatic installer publication.

## Verification boundary

Automated unit, integration and browser tests support implementation checks. The user explicitly requested no Computer Use and will inspect the packaged Windows release. Native WebView2 visual approval must be recorded separately after feedback.
