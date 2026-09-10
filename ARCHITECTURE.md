# Nexume architecture

Nexume is a Windows 10/11 desktop application, built with Tauri 2, Rust, React, TypeScript and Vite. SQLite is the authority for personal data; no account or network request is required to start.

## Boundaries

- `src/domain`: validated, portable entities, episode/rating rules, backup parsing and statistics. No framework, SQL, WebGL or remote DTOs.
- `src/core/database`: repository interface, SQLite implementation through the Tauri SQL plugin and an explicitly separate browser preview adapter. Atomic snapshot writes use a native transaction so plugin connection pooling cannot split a transaction across connections.
- `src/app`: Zustand state and serialized mutations. Changes become visible after successful persistence. Errors remain visible and do not silently reset the library.
- `src/services/anilist`: nullable DTO mapping and a cancellable, rate-aware GraphQL transport. Metadata refresh never changes personal fields.
- `src/graphics`: isolated Three.js renderer receiving display items and callbacks. Bounded meshes and texture ownership; no database knowledge.
- `src/features`: desktop workflows. Shared accessible controls remain usable without WebGL.
- `src/services/social`: opt-in public DTOs, Supabase adapter and a durable queue. Private notes never enter public payloads.
- `src-tauri`: migrations, atomic persistence, bounded image disk cache, native file dialogs and window state.

Native window decorations deliberately preserve Windows Snap Layouts and familiar window controls. Browser preview storage is independent of the installed application's SQLite database. Mobile is a documented future port, not an implementation target.

## Implementation sequence

Foundation → metadata and practical library → Three.js collection → diary/lists/profile/statistics → optional sharing → accessibility, verification and Windows packaging. No mandatory paid services, telemetry or generative API calls.

## References

- [Tauri SQL plugin](https://v2.tauri.app/plugin/sql/)
- [Tauri window state](https://v2.tauri.app/plugin/window-state/)
- [AniList API](https://github.com/AniList/ApiV2-GraphQL-Docs)

See DATABASE.md, COLLECTION_3D.md and SOCIAL_ARCHITECTURE.md for invariants and lifecycle decisions.
## Watchlist and random recommendations

Watchlist is a dedicated view of entries with personalStatus=Planning; it does not duplicate library records. Global search and the add action on details save new entries to that state. Watchlist supports local search, genre filtering, priority sorting and a Start watching action that updates the existing record and creates the normal diary event.

Recommend selects uniformly from the current filtered candidate pool and avoids the immediately previous result when alternatives exist. Sources are Watchlist, Library, AniList popular search results and an explicitly named offline sample catalog. It is a random discovery aid, not an AI prediction or a claim to sample the entire AniList catalog. Genre, format, release year and episode limits are combined; unknown values are excluded when the corresponding numeric constraint is active. Animation timers and remote requests are cancelled on navigation/filter changes. Reduced motion reveals the result without the animated sequence.

Statistics use SVG and CSS charts with accessible labels: library status donut, monthly diary activity, half-star histogram, genres, studios and release decades. The 54px header has an actual search field; submitting it opens the existing cancellable search dialog with the entered query. Route transitions keep the navigation rail/header stable and respect reduced motion.
