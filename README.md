# Nexume

**Your anime, remembered.**

Nexume is a Windows desktop app for building a personal anime collection. Track your progress, discover your next series, and keep ratings, reviews, and watchlists in one place—with no account required for local features.

[Releases](https://github.com/Hakaelll/Nexume/releases) · [Latest version: 0.8.0](docs/RELEASE-0.8.0.md)

![Nexume anime collection](docs/images/gallery-discover.png)

## Features

- **Your collection, your view.** Browse anime in an interactive 3D collection, poster grid, or compact table.
- **Progress that stays with you.** Track episodes, rewatches, ratings, favorites, and personal reviews. Explore your viewing diary and statistics.
- **A useful Home.** Rotate between anime with aired episodes left to watch and browse every ongoing title in a horizontal Continue watching shelf.
- **Find something for tonight.** Match anime to your available time, then watch the candidates light up before your pick is revealed. Explore the broader catalog with a separate shuffle mode.
- **Follow the season.** Discover anime through AniList, add an entire current or upcoming season to Watchlist, and see announced episodes in Calendar.
- **Make it personal.** Create custom lists with cover images, customize your profile, and choose full or reduced animations.

## Latest version — 0.8.0

This update adds episode-aware Home rotation, horizontal browsing, illuminated tonight picks, complete season imports, and lighter navigation with a new loading indicator.

Windows x64 packages:

- `Nexume-0.8.0-windows-x64-setup.exe` — installer with English and Spanish language options.
- `Nexume-0.8.0-windows-x64.exe` — standalone executable using the same Windows app data location.

See the [release notes](docs/RELEASE-0.8.0.md) for packaging details. Published downloads are listed on the [GitHub Releases page](https://github.com/Hakaelll/Nexume/releases). Microsoft Edge WebView2 is required; builds are currently unsigned.

## Data and privacy

Your desktop collection is stored locally in SQLite. JSON backups let you export and restore it. Online discovery and airing schedules use AniList; broadcast times do not guarantee availability on streaming services.

Optional sharing uses Supabase and requires configuration. Keep local configuration in `.env.local`; use only a public/anon key in the frontend, never a service-role key. Desktop and browser preview collections are stored separately.

## Development

Built with **Tauri 2, Rust, React, TypeScript, Zustand, SQLite, Three.js, and Vite**.

Requires Node.js 22.18+, pnpm, Rust with the MSVC toolchain, Visual Studio C++ Build Tools, and the Windows SDK.

```sh
pnpm install --frozen-lockfile
pnpm dev          # Browser preview
pnpm tauri dev    # Desktop development
pnpm tauri build  # Windows installer
```

For optional sharing, copy [`.env.example`](.env.example) to `.env.local` and follow the [sharing architecture](SOCIAL_ARCHITECTURE.md). See [Architecture](ARCHITECTURE.md) for implementation details and [Assets](docs/ASSETS.md) for artwork and font credits.
