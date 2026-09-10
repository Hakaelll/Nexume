use reqwest::Url;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{Connection, SqliteConnection};
use std::{path::PathBuf, time::Duration};
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

async fn save_snapshot(db: &mut SqliteConnection, state: &Value) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    for table in [
        "custom_list_entries",
        "ratings",
        "reviews",
        "watch_history",
        "custom_lists",
        "library_entries",
        "anime_metadata",
        "profile",
        "preferences",
        "sync_queue",
        "search_history",
    ] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    for e in array(state, "entries")? {
        let entry_id = field(e, "localId")?;
        let aid = e["anilistId"].as_i64().ok_or("Invalid AniList ID")?;
        sqlx::query("INSERT INTO anime_metadata VALUES (?, ?)")
            .bind(aid)
            .bind(e["cachedMetadata"].to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
        sqlx::query("INSERT INTO library_entries VALUES (?, ?, ?, ?, ?, ?)")
            .bind(entry_id)
            .bind(aid)
            .bind(field(e, "personalStatus")?)
            .bind(e["watchedEpisodes"].as_i64().ok_or("Invalid progress")?)
            .bind(e["totalEpisodes"].as_i64())
            .bind(e.to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
        if let Some(rating) = e["personalRating"].as_i64() {
            sqlx::query("INSERT INTO ratings VALUES (?, ?)")
                .bind(entry_id)
                .bind(rating)
                .execute(&mut *tx)
                .await
                .map_err(err)?;
        }
        sqlx::query("INSERT INTO reviews VALUES (?, ?, ?, ?)")
            .bind(entry_id)
            .bind(field(e, "review")?)
            .bind(e["reviewContainsSpoilers"].as_bool().unwrap_or(false))
            .bind(field(e, "reviewPrivacy")?)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    for l in array(state, "lists")? {
        sqlx::query("INSERT INTO custom_lists VALUES (?, ?, ?)")
            .bind(field(l, "id")?)
            .bind(field(l, "publicId")?)
            .bind(l.to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
        for (position, item) in array(l, "entryIds")?.iter().enumerate() {
            sqlx::query("INSERT INTO custom_list_entries VALUES (?, ?, ?)")
                .bind(field(l, "id")?)
                .bind(item.as_str().ok_or("Invalid list member")?)
                .bind(position as i64)
                .execute(&mut *tx)
                .await
                .map_err(err)?;
        }
    }
    for h in array(state, "history")? {
        sqlx::query("INSERT INTO watch_history VALUES (?, ?, ?, ?)")
            .bind(field(h, "id")?)
            .bind(field(h, "entryId")?)
            .bind(field(h, "at")?)
            .bind(h.to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    sqlx::query("INSERT INTO profile VALUES (?, ?)")
        .bind(field(&state["profile"], "localId")?)
        .bind(state["profile"].to_string())
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    sqlx::query("INSERT INTO preferences VALUES ('app', ?)")
        .bind(state["preferences"].to_string())
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    for q in array(state, "queue")? {
        sqlx::query("INSERT INTO sync_queue VALUES (?, ?, ?)")
            .bind(field(q, "id")?)
            .bind(field(q, "publicId")?)
            .bind(q.to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    for (i, q) in array(state, "searchHistory")?.iter().enumerate() {
        sqlx::query("INSERT INTO search_history VALUES (?, ?)")
            .bind(i as i64)
            .bind(serde_json::json!({"query":q}).to_string())
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    tx.commit().await.map_err(err)
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
async fn trim_cache(dir: &PathBuf) -> Result<(), String> {
    let mut files = tokio::fs::read_dir(dir).await.map_err(err)?;
    let mut items = Vec::new();
    let mut total = 0;
    while let Some(file) = files.next_entry().await.map_err(err)? {
        let m = file.metadata().await.map_err(err)?;
        if m.is_file() {
            total += m.len();
            items.push((m.modified().ok(), m.len(), file.path()));
        }
    }
    items.sort_by_key(|i| i.0);
    for (_, len, path) in items {
        if total <= 256 * 1024 * 1024 {
            break;
        }
        if tokio::fs::remove_file(path).await.is_ok() {
            total -= len;
        }
    }
    Ok(())
}
#[tauri::command]
async fn cache_image(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let url = image_url(&url)?;
    let dir = app.path().app_cache_dir().map_err(err)?.join("images");
    tokio::fs::create_dir_all(&dir).await.map_err(err)?;
    let key = format!("{:x}", Sha256::digest(url.as_str().as_bytes()));
    let path = dir.join(format!("{key}.img"));
    if tokio::fs::try_exists(&path).await.map_err(err)? {
        return Ok(path.to_string_lossy().into());
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(err)?;
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
    let temp = dir.join(format!("{key}.tmp"));
    tokio::fs::write(&temp, &bytes).await.map_err(err)?;
    tokio::fs::rename(&temp, &path).await.map_err(err)?;
    trim_cache(&dir).await?;
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
