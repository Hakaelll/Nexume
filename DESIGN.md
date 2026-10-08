# Nexume design system

The six October 7 screenshots and PRODUCT.md define the incumbent visual world. Preserve Inter, italic headings, warm light canvas, magenta actions and colorful covers. Primary surfaces are Operate; Collection adds an Experience surface while retaining tracking controls.

## Semantic styling

`tokens.css` defines canvas, panel, soft panel, text, secondary text, border, accent, focus and movement values for light and charcoal dark themes. Structural and Playful rules consume these aliases; `workspace.css` contains responsive refinements shared by both themes. The standalone public viewer retains its own styling.

- Light: canvas #f6f2ee, panel #ffffff, text #111111.
- Dark: canvas #181719, panel #242226, text #f6f2ee.
- Magenta #ff2e95 is shared across themes. Image banners keep white text and a dark scrim.
- Headings scale with available width. Covers reserve aspect ratios. Grid titles have three lines and a complete accessible title.
- Home retains two wide columns where space permits, then stacks. Its compact protagonist includes a real banner when available.
- Collection allocates height from the viewport while preserving navigation and thumbnails. Profile shows existing favorites and one compact add slot, up to six favorites.

## Interaction and motion

Press 120 ms, menu 180 ms, dialog entrance 220 ms, pointer dismissal 160 ms; keyboard dismissal remains immediate. Cover-to-detail transition may use up to 420 ms. Progress uses scaleX, navigation moves through transform and 3D rendering stops after the scene settles. Reduced motion removes parallax, roulette and decorative travel while preserving brief feedback.

Keep native scrolling, card-aligned carousel arrows with disabled boundaries, keyboard selection, visible focus and focus restoration. Forms retain drafts on failed persistence. Rewatch resets require explicit confirmation.

## Review

Use Impeccable, accessibility, frontend architecture and animation guidance, with the approved identity taking priority. Automated layout and behavior checks support the user-requested release review in WebView2.
