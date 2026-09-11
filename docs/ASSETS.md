# Assets and attribution

- `public/brand/logo.png`: the exact user-provided Nexume emblem. The original file is preserved. CSS inverts it for the dark interface; Tauri derives standard executable/installer icon sizes from the source. No generated replacement logo is used.
- `src-tauri/icons`: generated Windows packaging icons. Mobile icon directories produced by Tauri's general icon utility are ignored and are not application targets.
- Space Grotesk: locally bundled via `@fontsource/space-grotesk`, SIL Open Font License. Georgia is a system serif fallback, not a redistributed font.
- Lucide icons: ISC licensed, through `lucide-react`.
- Normal metadata and artwork provider: AniList GraphQL, with source URLs preserved in cached metadata.
- `public/demo/anime.json` and its twelve cached covers: optional test fixtures retrieved on September 9, 2026 from Jikan's public MyAnimeList metadata endpoint because AniList explicitly reported an API shutdown. This is a fixture-generation fallback, **not** a runtime Jikan provider. AniList remains the application's metadata provider. AniList community scores are deliberately null in these fixtures; MAL scores are not relabeled as AniList scores. Sample detail pages identify their source.
- Anime poster artwork and descriptions belong to their respective rights holders. They identify the titles in the optional personal-use sample library. `scripts/fetch-sample.mjs` documents source retrieval; passing `--fixture-from-jikan` is an explicit build-time choice. No paid asset service is required.

Sample progress, ratings, likes and thoughts are illustrative, not the user's viewing history. The app asks before adding them and tags them `sample`.


## Playful typography (0.5.0)

Inter is bundled locally through @fontsource/inter under the SIL Open Font License, including 400/500/600 normal and 700/900 italic. No Fraunces, Antonio or commercial fonts are included in the current desktop bundle. Space Grotesk remains available to the existing public viewer and legacy structural styles. Anime artwork is displayed in color.
