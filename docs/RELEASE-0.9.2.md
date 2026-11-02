# Nexume 0.9.2

Nexume has a new geometric ouroboros logo, with the existing magenta color and italic wordmark.

- Replace the emblem in navigation, startup, profile placeholders, Settings, and the public collection viewer with a sharp SVG mark.
- Update the browser favicon and Windows application, installer, and uninstaller icons.
- Refresh the executable's embedded icon when the ICO changes, including incremental builds.
- Generate all brand assets from one SVG source with `pnpm brand:icons`.

See [verification](VERIFICATION-0.9.2.md) for the checks performed on this release.

The Windows x64 installer is unsigned. Native WebView2 visual approval remains pending the user's review.
