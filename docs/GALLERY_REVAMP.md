# Visual revamp · 0.5.1

Current direction: Playful, replacing the unfinished Henry iteration and the earlier Letter design. See `../DESIGN.md` and `PLAYFUL_STYLE_REFERENCE.md`.

`src/styles/playful.css` supplies the desktop theme: oat canvas, Inter italic display, magenta primary actions, rounded panels, pill controls and colored anime artwork. The reference is adapted to the existing anime application rather than replacing its functional screens with marketing copy.

The bottom profile photo remains the only Profile navigation entry. All quick card actions and catalog-wide recommendation behavior remain available. No database migration is required. Profile validation also accepts compact embedded JPEG avatars. The native About version reads package.json.

The candidate artwork preview is decorative and non-interactive. The actual selection still comes from the selected source and active filters. The reveal respects reduced motion and request cancellation. AniList availability remains external to the app; local selection sources do not require it.

Version 0.5.1 adds a decelerating cover roulette, a paper-colored WebGL collection with inset controls, relevance-based catalog search, panoramic detail headers, colored statistics and local profile-photo uploads. The upload accepts JPG/PNG/WebP up to 10 MB and stores a center-cropped 256-pixel JPEG.
