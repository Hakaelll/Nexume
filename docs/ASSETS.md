# Assets and attribution

- `public/brand/logo.svg`: the canonical Nexume mark, a geometric ouroboros created for the application at the user's request. It uses the existing magenta identity and has no font or external image dependency. The original emblem remains in Git history.
- `public/brand/logo.png`: the generated 1024px transparent version of the mark. The interface uses the SVG to keep the edges sharp at different display scales.
- `public/brand/app-icon.svg`: the generated favicon and Windows icon source, with the same mark on a rounded ink background. Both themes preserve the original colors without CSS inversion.
- `src-tauri/icons`: generated Windows packaging icons. `pnpm brand:icons` regenerates and verifies the PNG dimensions, alpha channels, and multi-resolution ICO from `logo.svg`, using the installed Tauri CLI. `src-tauri/build.rs` tracks `icons/icon.ico` so incremental builds refresh the executable's icon resource. Intermediate platform files stay in the ignored `.tools/brand/generated-icons` directory. Windows remains the application target.
- Space Grotesk: locally bundled via `@fontsource/space-grotesk`, SIL Open Font License. Georgia is a system serif fallback, not a redistributed font.
- Lucide icons: ISC licensed, through `lucide-react`.
- Normal metadata and artwork provider: AniList GraphQL, with source URLs preserved in cached metadata.
- `public/demo/anime.json` and its twelve cached covers: optional test fixtures retrieved on September 9, 2026 from Jikan's public MyAnimeList metadata endpoint because AniList explicitly reported an API shutdown. This is a fixture-generation fallback, **not** a runtime Jikan provider. AniList remains the application's metadata provider. AniList community scores are deliberately null in these fixtures; MAL scores are not relabeled as AniList scores. Sample detail pages identify their source.
- Anime poster artwork and descriptions belong to their respective rights holders. They identify the titles in the optional personal-use sample library. `scripts/fetch-sample.mjs` documents source retrieval; passing `--fixture-from-jikan` is an explicit build-time choice. No paid asset service is required.

Sample progress, ratings, likes and thoughts are illustrative, not the user's viewing history. The app asks before adding them and tags them `sample`.


## Playful typography (0.5.0)

Inter is bundled locally through @fontsource/inter under the SIL Open Font License, including 400/500/600 normal and 700/900 italic. No Fraunces, Antonio or commercial fonts are included in the current desktop bundle. Space Grotesk remains available to the existing public viewer and legacy structural styles. Anime artwork is displayed in color.
