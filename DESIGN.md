# Nexume design system

## Source and philosophy

The full supplied “Active Theory — Style Reference” has been read and is preserved in `docs/ACTIVE_THEORY_REFERENCE.md`. This system translates its black void, ghost chrome, hairlines, geometric UI and editorial serif into a personal anime library. It does not copy the portal, particle field or proprietary typography. The supplied monochrome sun emblem is the brand asset; do not substitute a generated logo. White text replaces the reference's low-contrast black-on-violet CTA labels for accessibility.

The collection is the subject. Home means continuing; Collection means remembering; Grid means browsing; List means administering. Avoid dashboards, plastic cases, neon, stock illustrations and nested cards.

## Tokens

Void black #000000; Ghost White #FFFFFF; secondary #C6C6C6; muted #999999; hairlines #4D4D4D at restrained opacity; Dusk Violet #343755. Covers and banners supply color. Use Space Grotesk locally bundled for interface text and Georgia for reviews and quick thoughts. Labels use small uppercase tracking; headings use generous negative space. Spacing follows 4/8/12/16/24/32/48/64px. Borders are one pixel. Corners are minimal.

## Layout

A 64px navigation rail has persistent icons and accessible names; tooltips expose labels on hover and focus. A quiet top bar contains location, connectivity and global search. Desktop content uses broad margins and generous image areas. Native Windows decorations keep resize, maximize and Snap behavior. Target 1080p, 1440p and ultrawide, with a practical minimum window size.

Collection uses a black stage, suspended covers and editorial information outside panels. Grid prioritizes portrait artwork. List provides configurable sortable columns. Detail uses a masked banner, substantial cover, separate community and personal ratings, and a readable review. Profile is a shelf of six manually chosen favorites. Lists emphasize title, description and curated order.

## Components

Small monochrome five-star ratings support half steps, keyboard input and hover previews. Likes and profile favorites are separate. Progress controls expose minus, numeric entry and plus; completion is a quiet inline offer. Reviews are serif text until editing. Spoilers require deliberate reveal. Empty states use text and a search action. Loading uses subtle placeholders. Error messages include retry where meaningful.

## Motion and access

Short opacity transitions, gentle interpolation and bounded camera movement; no bounce or constant rotation. Reduced motion stops idle animation and shortens transitions. Visible focus rings and native form semantics are required. Every collection action has a DOM/keyboard route. WebGL failure offers Grid.

Do: use image scale, typography and space to establish hierarchy. Don't: use large colored stars, RGB lighting, glassmorphism, corporate metric cards or imitation Sony assets.
## Visual refinement requested during review

The user requested less copy and more color. Current UI removes decorative kickers, repeated taglines and placeholder editorial prose. Page names are direct: Home, Library, Lists, Diary, Calendar and Settings. Empty Home and Library show bundled anime artwork and a short sample action; they do not create personal records automatically.

The base is near-black #08090E with violet #7461CF and pale violet #C5B7FF for primary actions, active navigation and focus. Dark blue/violet surfaces are restricted to the welcome composition and collection shortcut. Artwork remains the main source of color. Retain the original supplied emblem. Do not reintroduce slogans, fictional establishment dates or decorative technical labels.

## September 10 interaction refinement

Compact the header to 54px, remove redundant section labels and place search in a bordered, focusable field. Add Watchlist and Recommend navigation. Use the same restrained violet family for recommendation motion, with a poster reveal rather than particles or a full-screen effect. Statistics use teal, amber and violet data series against quiet dark panels. Animate route entry with a short opacity/position transition, disabled when the user or OS requests reduced motion.
