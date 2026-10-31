# Nexume 0.9.1

## QHD layout and dark appearance

- Align the header, pages, Library and anime details within a shared 1840px workspace, with smaller gutters in narrow windows.
- Keep cover-size preferences, magenta actions, italic headings and full-color artwork. Limit prose width and allow filters and labels to wrap.
- Bound the 3D scene height and reserve separate space for its heading, canvas, progress, thumbnails and navigation.
- Use a neutral charcoal dark theme with consistent surfaces, readable calendar dates, native dark controls, selected navigation icons and visible episode progress.
- Keep dark text on magenta buttons and a visible focus indicator.

## Large collections

- Reuse Library's nearby-card mounting in Home and Watchlist, including progress and priority controls.
- Preserve complete searchable titles, keyboard focus, open rating editors and pending writes while distant cards use lightweight placeholders.
- Reserve the completion-action row in tracking placeholders and keep episode adjustments ordered when an edited progress field loses focus.
- Preserve the existing 3D texture/quality budgets and renderer idle behavior. Backups and the database format are unchanged.

## Verification

See [verification](VERIFICATION-0.9.1.md) and [performance evidence](PERFORMANCE-0.9.1.md) for executed checks and measured limits. Browser tests use local sample data and do not access the installed collection.

The Windows x64 installer is unsigned. Native WebView2 visual approval and GPU performance on the user's monitor remain separate from the automated browser checks.
