# Future mobile port — no mobile implementation in v1

Reuse domain schemas/rules, AniList DTO mapping, backup format, social DTOs and SQLite migrations. Keep desktop/native adapters replaceable. Tauri mobile can reuse Rust core and SQL plugin after platform-specific lifecycle testing.

Redesign rail navigation, dense list administration, keyboard shortcuts, context menus, window chrome and broad desktop detail composition for touch. Use a bottom navigation structure and explicit action sheets. Adapt search, focus, safe areas, background persistence and text editing for mobile keyboards.

Default to a practical Grid if device GPU/thermal budgets cannot sustain Collection. A future touch scene needs controlled swipe, selection, lower texture budgets, app-suspend disposal and battery profiling. Do not simply shrink the desktop renderer.

Evaluate Android scoped storage, iOS document pickers, SQLite backup/restore, authentication deep links and universal links, credential storage and offline media eviction. Android builds require SDK/NDK and signing; iOS requires macOS, Xcode and provisioning. Add device accessibility, gesture, rotation, resume and low-memory tests before claiming support. No mobile builds, layouts or gestures ship now.
