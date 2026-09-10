# Local persistence

SQLite database: `nexume.db` in the Tauri application configuration directory. Migrations start at v1 and are registered by the SQL plugin. Never erase a failed database on startup. Foreign keys, uniqueness, valid status and integer rating/progress checks protect data.

Tables: anime_metadata, library_entries, ratings, reviews, watch_history, custom_lists, custom_list_entries, profile, preferences, sync_queue and search_history. Structured metadata and less frequently queried fields use validated JSON, while relationships and frequently used fields remain explicit. Ordered list membership has unique list/entry pairs and foreign keys. Public IDs are distinct random UUIDs.

Reads use `@tauri-apps/plugin-sql`. A native command applies a validated state snapshot in one SQLite transaction using the same database file. This intentionally avoids BEGIN/COMMIT calls across the SQL plugin's pooled connections. The serialized application mutation queue prevents lost updates. For this personal v1, snapshot writes favor consistency and straightforward restore; incremental transactions can replace the repository without changing domain/UI contracts.

View preferences use a separate UPDATE command, so collection selection does not rewrite personal records. A fresh database is initialized with its profile and preferences before either mutation path is available. Both paths share the application mutation queue.

JSON backups contain backupVersion, export time, metadata, personal entries, reviews, lists, profile, diary and preferences. They exclude authentication sessions, publication ownership and pending uploads. Restore validates shape, versions, references, duplicate IDs and field limits, then displays a summary and explicit merge/replace choice. Merge preserves existing personal records and adds missing records. A pre-restore backup remains recoverable. CSV is a convenience export, with formula injection mitigation.

The browser preview uses localStorage under a separate versioned key, never masquerading as native SQLite. Storage failure is visible. Disk artwork cache is native, bounded and separate from personal records; backups preserve source URLs, not local file paths.
