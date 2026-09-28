use crate::{array, err, field};
use serde_json::Value;
use sqlx::{Connection, SqliteConnection};

async fn execute_script(db: &mut SqliteConnection, source: &str) -> Result<(), String> {
    // These embedded scripts contain only simple statements and full-line comments.
    let sql = source
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    for statement in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
        sqlx::query(statement)
            .execute(&mut *db)
            .await
            .map_err(err)?;
    }
    Ok(())
}

// Stage the requested snapshot once. All reconciliation is set based: the
// number of database round trips does not grow with the collection or diary.
pub(crate) async fn save_snapshot(db: &mut SqliteConnection, state: &Value) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    execute_script(&mut tx, include_str!("snapshot_stage.sql")).await?;
    for entry in array(state, "entries")? {
        field(entry, "localId")?;
        field(entry, "personalStatus")?;
        field(entry, "review")?;
        field(entry, "reviewPrivacy")?;
        entry["anilistId"].as_i64().ok_or("Invalid AniList ID")?;
        entry["watchedEpisodes"]
            .as_i64()
            .ok_or("Invalid progress")?;
    }
    for list in array(state, "lists")? {
        array(list, "entryIds")?;
    }
    for (name, statement) in [
        ("entries", "INSERT INTO incoming_entries SELECT json_extract(value,'$.localId'), json_extract(value,'$.anilistId'), value FROM json_each(?)"),
        ("lists", "INSERT INTO incoming_lists SELECT json_extract(value,'$.id'), json_extract(value,'$.publicId'), value FROM json_each(?)"),
        ("history", "INSERT INTO incoming_history SELECT json_extract(value,'$.id'), value FROM json_each(?)"),
        ("queue", "INSERT INTO incoming_queue SELECT json_extract(value,'$.id'), value FROM json_each(?)"),
        ("searchHistory", "INSERT INTO incoming_search SELECT key, json_object('query',value) FROM json_each(?)"),
    ] {
        array(state, name)?;
        sqlx::query(statement).bind(state[name].to_string())
            .execute(&mut *tx).await.map_err(err)?;
    }
    sqlx::query("INSERT INTO incoming_profile VALUES (?, ?)")
        .bind(field(&state["profile"], "localId")?)
        .bind(state["profile"].to_string())
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    sqlx::query("INSERT INTO incoming_preferences VALUES ('app', ?)")
        .bind(state["preferences"].to_string())
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    // Rewriting rows used to preserve snapshot array order implicitly. Store
    // that order once, without updating the position of every row on an insert.
    let mut order = serde_json::Map::new();
    for (table, key, id) in [
        ("library_entries", "entries", "localId"),
        ("custom_lists", "lists", "id"),
        ("watch_history", "history", "id"),
        ("sync_queue", "queue", "id"),
    ] {
        order.insert(
            table.into(),
            Value::Array(
                array(state, key)?
                    .iter()
                    .map(|row| row[id].clone())
                    .collect(),
            ),
        );
    }
    sqlx::query("INSERT INTO incoming_preferences VALUES ('collection_order', ?)")
        .bind(Value::Object(order).to_string())
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    execute_script(&mut tx, include_str!("snapshot_merge.sql")).await?;
    tx.commit().await.map_err(err)
}
