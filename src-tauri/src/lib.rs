mod image_cache;
mod persistence;
use persistence::save_snapshot;
use reqwest::Url;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{Connection, SqliteConnection};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const SCHEMA: &str = include_str!("../migrations/001_initial.sql");
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn field<'a>(value: &'a Value, name: &str) -> Result<&'a str, String> {
    value[name]
        .as_str()
        .ok_or_else(|| format!("Missing {name}"))
}
fn array<'a>(value: &'a Value, name: &str) -> Result<&'a Vec<Value>, String> {
    value[name]
        .as_array()
        .ok_or_else(|| format!("Missing {name}"))
}

#[tauri::command]
async fn save_state(app: tauri::AppHandle, state: Value) -> Result<(), String> {
    if state.to_string().len() > 30 * 1024 * 1024 {
        return Err("Collection exceeds supported snapshot size".into());
    }
    let path = app.path().app_config_dir().map_err(err)?.join("nexume.db");
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(10));
    let mut db = SqliteConnection::connect_with(&options)
        .await
        .map_err(err)?;
    save_snapshot(&mut db, &state).await
}

#[tauri::command]
async fn save_preferences(app: tauri::AppHandle, preferences: Value) -> Result<(), String> {
    if !preferences.is_object() || preferences.to_string().len() > 5 * 1024 * 1024 {
        return Err("Invalid preferences".into());
    }
    let path = app.path().app_config_dir().map_err(err)?.join("nexume.db");
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .busy_timeout(Duration::from_secs(10));
    let mut db = SqliteConnection::connect_with(&options)
        .await
        .map_err(err)?;
    sqlx::query("UPDATE preferences SET data = ? WHERE key = 'app'")
        .bind(preferences.to_string())
        .execute(&mut db)
        .await
        .map_err(err)?;
    Ok(())
}

fn image_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw).map_err(err)?;
    let host = url.host_str().unwrap_or("");
    if url.scheme() != "https"
        || !(host == "anilist.co" || host.ends_with(".anilist.co"))
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Only HTTPS AniList artwork can be cached".into());
    }
    Ok(url)
}
#[tauri::command]
async fn cache_image(
    app: tauri::AppHandle,
    cache: tauri::State<'_, image_cache::ImageCache>,
    url: String,
) -> Result<String, String> {
    let url = image_url(&url)?;
    let dir = app.path().app_cache_dir().map_err(err)?.join("images");
    tokio::fs::create_dir_all(&dir).await.map_err(err)?;
    let key = format!("{:x}", Sha256::digest(url.as_str().as_bytes()));
    let path = dir.join(format!("{key}.img"));
    if tokio::fs::try_exists(&path).await.map_err(err)? {
        return Ok(path.to_string_lossy().into());
    }
    let client = image_cache::client()?;
    let mut response = client
        .get(url)
        .send()
        .await
        .map_err(err)?
        .error_for_status()
        .map_err(err)?;
    if response.content_length().unwrap_or(0) > 8 * 1024 * 1024 {
        return Err("Artwork too large".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(err)? {
        if bytes.len() + chunk.len() > 8 * 1024 * 1024 {
            return Err("Artwork too large".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    if !(bytes.starts_with(b"\x89PNG")
        || bytes.starts_with(b"\xff\xd8\xff")
        || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP")))
    {
        return Err("Unsupported artwork format".into());
    }
    let path = cache.commit(&dir, &key, &bytes, 256 * 1024 * 1024).await?;
    Ok(path.to_string_lossy().into())
}
#[tauri::command]
async fn save_export(filename: String, content: String) -> Result<bool, String> {
    if content.len() > 30 * 1024 * 1024 {
        return Err("Export too large".into());
    }
    let extension = if filename.ends_with(".csv") {
        "csv"
    } else {
        "json"
    };
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&filename)
        .add_filter("Nexume export", &[extension])
        .save_file()
        .await;
    if let Some(file) = file {
        file.write(content.as_bytes()).await.map_err(err)?;
        Ok(true)
    } else {
        Ok(false)
    }
}
#[tauri::command]
async fn read_backup() -> Result<Option<String>, String> {
    if let Some(file) = rfd::AsyncFileDialog::new()
        .add_filter("Nexume backup", &["json"])
        .pick_file()
        .await
    {
        let metadata = tokio::fs::metadata(file.path()).await.map_err(err)?;
        if metadata.len() > 25 * 1024 * 1024 {
            return Err("Backup exceeds 25 MB".into());
        }
        String::from_utf8(file.read().await).map(Some).map_err(err)
    } else {
        Ok(None)
    }
}
pub fn run() {
    tauri::Builder::default()
        .manage(image_cache::ImageCache::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:nexume.db",
                    vec![Migration {
                        version: 1,
                        description: "initial_local_library",
                        sql: SCHEMA,
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_state,
            save_preferences,
            cache_image,
            save_export,
            read_backup
        ])
        .run(tauri::generate_context!())
        .expect("Unable to run Nexume");
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture_state() -> Value {
        serde_json::json!({"entries":[{"localId":"entry-1","anilistId":1,"personalStatus":"Watching","watchedEpisodes":3,"totalEpisodes":26,"personalRating":9,"review":"A review","reviewContainsSpoilers":true,"reviewPrivacy":"Private","privateNotes":"Stay local","cachedMetadata":{"anilistId":1,"romaji":"Cowboy Bebop"}}],"lists":[{"id":"list-1","publicId":"public-1","entryIds":["entry-1"]}],"profile":{"localId":"profile-1","displayName":"Collector"},"preferences":{"view":"Collection"},"history":[{"id":"event-1","entryId":"entry-1","at":"2026-09-09","kind":"episode"}],"queue":[{"id":"job-1","publicId":"public-1"}],"searchHistory":["Cowboy Bebop"]})
    }
    #[tokio::test]
    async fn incremental_save_only_writes_changed_rows_in_a_large_collection() {
        let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&mut db).await.unwrap();
        let mut state = fixture_state();
        let template = state["entries"][0].clone();
        state["entries"] = (0..500)
            .map(|i| {
                let mut entry = template.clone();
                entry["localId"] = serde_json::json!(format!("entry-{}", i + 1));
                entry["anilistId"] = serde_json::json!(i + 1);
                entry["cachedMetadata"]["anilistId"] = serde_json::json!(i + 1);
                entry
            })
            .collect();
        let started = std::time::Instant::now();
        save_snapshot(&mut db, &state).await.unwrap();
        let initial_ms = started.elapsed().as_millis();
        sqlx::query("CREATE TEMP TABLE write_audit (table_name TEXT, operation TEXT)")
            .execute(&mut db)
            .await
            .unwrap();
        for table in [
            "anime_metadata",
            "library_entries",
            "ratings",
            "reviews",
            "watch_history",
            "custom_lists",
            "custom_list_entries",
            "profile",
            "preferences",
            "sync_queue",
            "search_history",
        ] {
            for operation in ["INSERT", "UPDATE", "DELETE"] {
                sqlx::raw_sql(&format!("CREATE TEMP TRIGGER audit_{table}_{operation} AFTER {operation} ON main.{table} BEGIN INSERT INTO write_audit VALUES ('{table}', '{operation}'); END;"))
                    .execute(&mut db).await.unwrap();
            }
        }
        save_snapshot(&mut db, &state).await.unwrap();
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM write_audit")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(
            count.0, 0,
            "unchanged snapshots must not rewrite any persistent row"
        );
        state["entries"][0]["watchedEpisodes"] = serde_json::json!(4);
        let started = std::time::Instant::now();
        save_snapshot(&mut db, &state).await.unwrap();
        let writes: Vec<(String, String)> =
            sqlx::query_as("SELECT table_name, operation FROM write_audit")
                .fetch_all(&mut db)
                .await
                .unwrap();
        assert_eq!(writes, vec![("library_entries".into(), "UPDATE".into())]);
        eprintln!("500 entries: initial snapshot {initial_ms} ms, incremental episode {} ms, persistent writes {}", started.elapsed().as_millis(), writes.len());
        // Removing a rating also updates its normalized table, without losing review data.
        state["entries"][0]["personalRating"] = Value::Null;
        state["entries"][0]["review"] = serde_json::json!("Updated words");
        state["history"] = serde_json::json!([]);
        state["queue"] = serde_json::json!([]);
        state["searchHistory"] = serde_json::json!([]);
        save_snapshot(&mut db, &state).await.unwrap();
        let ratings: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM ratings")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(ratings.0, 499);
        let review: (String,) = sqlx::query_as("SELECT body FROM reviews WHERE entry_id='entry-1'")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(review.0, "Updated words");
        for table in ["watch_history", "sync_queue", "search_history"] {
            let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM {table}"))
                .fetch_one(&mut db)
                .await
                .unwrap();
            assert_eq!(count.0, 0);
        }
    }
    #[tokio::test]
    async fn restores_reorder_lists_swap_identities_delete_and_reject_duplicates_atomically() {
        let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&mut db).await.unwrap();
        let mut state = fixture_state();
        let mut second = state["entries"][0].clone();
        second["localId"] = serde_json::json!("entry-2");
        second["anilistId"] = serde_json::json!(2);
        state["entries"].as_array_mut().unwrap().push(second);
        state["lists"][0]["entryIds"] = serde_json::json!(["entry-1", "entry-2"]);
        save_snapshot(&mut db, &state).await.unwrap();
        state["lists"][0]["entryIds"] = serde_json::json!(["entry-2", "entry-1"]);
        save_snapshot(&mut db, &state).await.unwrap();
        let members: Vec<(String,)> =
            sqlx::query_as("SELECT entry_id FROM custom_list_entries ORDER BY position")
                .fetch_all(&mut db)
                .await
                .unwrap();
        assert_eq!(members, vec![("entry-2".into(),), ("entry-1".into(),)]);
        state["entries"][0]["anilistId"] = serde_json::json!(2);
        state["entries"][1]["anilistId"] = serde_json::json!(1);
        state["lists"][0]["publicId"] = serde_json::json!("restored-public-id");
        save_snapshot(&mut db, &state).await.unwrap();
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM watch_history")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(
            count.0, 1,
            "cascaded history must be restored after identity changes"
        );
        let mut broken = state.clone();
        let duplicate = broken["entries"][0].clone();
        broken["entries"].as_array_mut().unwrap().push(duplicate);
        assert!(save_snapshot(&mut db, &broken).await.is_err());
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM library_entries")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(count.0, 2);
        state["entries"].as_array_mut().unwrap().reverse();
        save_snapshot(&mut db, &state).await.unwrap();
        let order: (String,) =
            sqlx::query_as("SELECT data FROM preferences WHERE key='collection_order'")
                .fetch_one(&mut db)
                .await
                .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&order.0).unwrap()["library_entries"],
            serde_json::json!(["entry-2", "entry-1"])
        );
        for key in ["entries", "lists", "history", "queue", "searchHistory"] {
            state[key] = serde_json::json!([]);
        }
        save_snapshot(&mut db, &state).await.unwrap();
        for table in [
            "library_entries",
            "anime_metadata",
            "ratings",
            "reviews",
            "custom_lists",
            "custom_list_entries",
            "watch_history",
        ] {
            let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM {table}"))
                .fetch_one(&mut db)
                .await
                .unwrap();
            assert_eq!(count.0, 0);
        }
    }
    #[tokio::test]
    async fn snapshot_roundtrip_and_failed_restore_are_atomic() {
        let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&mut db).await.unwrap();
        let state = fixture_state();
        save_snapshot(&mut db, &state).await.unwrap();
        let stored: (String,) =
            sqlx::query_as("SELECT data FROM library_entries WHERE id='entry-1'")
                .fetch_one(&mut db)
                .await
                .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&stored.0).unwrap(),
            state["entries"][0]
        );
        let rating: (i64,) = sqlx::query_as("SELECT value FROM ratings WHERE entry_id='entry-1'")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(rating.0, 9);
        let mut broken = state.clone();
        broken["lists"][0]["entryIds"] = serde_json::json!(["missing-entry"]);
        assert!(save_snapshot(&mut db, &broken).await.is_err());
        let count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM custom_list_entries WHERE entry_id='entry-1'")
                .fetch_one(&mut db)
                .await
                .unwrap();
        assert_eq!(count.0, 1);
        let mut updated = state;
        updated["entries"][0]["watchedEpisodes"] = serde_json::json!(4);
        save_snapshot(&mut db, &updated).await.unwrap();
        let progress: (i64,) = sqlx::query_as("SELECT watched FROM library_entries")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(progress.0, 4);
    }
    #[test]
    fn artwork_urls_are_scoped() {
        assert!(image_url("https://s4.anilist.co/file/cover.jpg").is_ok());
        for raw in [
            "http://s4.anilist.co/a",
            "https://evil.test/a",
            "https://anilist.co.evil.test/a",
            "file:///etc/passwd",
            "https://user@anilist.co/a",
        ] {
            assert!(image_url(raw).is_err());
        }
    }
    #[tokio::test]
    async fn schema_migrates_and_enforces_constraints() {
        let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&mut db).await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&mut db).await.unwrap();
        sqlx::query("INSERT INTO anime_metadata VALUES (1, '{}')")
            .execute(&mut db)
            .await
            .unwrap();
        assert!(
            sqlx::query("INSERT INTO library_entries VALUES ('a',1,'Watching',5,4,'{}')")
                .execute(&mut db)
                .await
                .is_err()
        );
        sqlx::query("INSERT INTO library_entries VALUES ('a',1,'Watching',1,4,'{}')")
            .execute(&mut db)
            .await
            .unwrap();
        assert!(sqlx::query("INSERT INTO ratings VALUES ('a',11)")
            .execute(&mut db)
            .await
            .is_err());
        let mut tx = db.begin().await.unwrap();
        sqlx::query("DELETE FROM library_entries")
            .execute(&mut *tx)
            .await
            .unwrap();
        tx.rollback().await.unwrap();
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM library_entries")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(count.0, 1);
    }
}
