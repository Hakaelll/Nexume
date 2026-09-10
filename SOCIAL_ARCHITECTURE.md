# Optional social publishing

LocalUser and OnlineIdentity are separate. The application starts in Local Profile without account configuration. Supabase is optional and only handles authentication and deliberately published profile/list/review snapshots. The public viewer is a separate static entry point with a configurable base URL; no Nexume domain is assumed.

`SocialBackendProvider` abstracts sign-in, sign-out, publish, unpublish and public retrieval. `SupabaseSocialProvider` uses a public anon/publishable key, never a service-role secret. Deployment SQL enables RLS: owners manage their own records. Visitors use the ID-specific `read_public_document` RPC; anonymous table access is revoked to prevent enumerating Unlisted records. The definer lookup returns only public/unlisted, nondeleted public snapshots. Unlisted links use independent cryptographically random public IDs. Unlisted is link visibility, not authentication.

Publication is explicit. Serialize a strict allowlist of public display fields. Exclude privateNotes, local IDs, internal paths, preferences, watch history and credentials. Include quick thoughts only after explicit opt-in. A private item cannot produce a public snapshot. Returning to Private queues deletion of any previous remote snapshot.

The durable SQLite queue stores public payloads and revisions, retries with backoff, and retains errors without blocking local edits. Coalesce work per public ID, with latest local revision winning; use conditional remote revision updates to avoid stale overwrites. A sign-in account owns its queue work. Never send one account's pending work using another account's session. Publication failures show Pending sync and can be retried.

Configuration absent: show Not configured, retain full local list/profile functionality. The static viewer renders only public DTOs and cannot access native commands or local storage. Setup and end-to-end cloud verification require a user-controlled Supabase project and viewer URL; the repository includes the schema and configuration instructions.
