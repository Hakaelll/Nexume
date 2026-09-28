INSERT INTO incoming_members
SELECT l.id, CASE WHEN member.type = 'text' THEN member.value END, member.key
FROM incoming_lists l, json_each(l.data, '$.entryIds') member;

-- Remove missing or reassigned identities first. Cascaded children are restored
-- below from the incoming snapshot; this also permits valid backup ID swaps.
DELETE FROM custom_lists WHERE NOT EXISTS
  (SELECT 1 FROM incoming_lists i WHERE i.id = custom_lists.id AND i.public_id = custom_lists.public_id);
DELETE FROM library_entries WHERE NOT EXISTS
  (SELECT 1 FROM incoming_entries i WHERE i.id = library_entries.id AND i.anilist_id = library_entries.anilist_id);
DELETE FROM watch_history WHERE NOT EXISTS (SELECT 1 FROM incoming_history i WHERE i.id = watch_history.id);
DELETE FROM sync_queue WHERE NOT EXISTS (SELECT 1 FROM incoming_queue i WHERE i.id = sync_queue.id);
DELETE FROM profile WHERE NOT EXISTS (SELECT 1 FROM incoming_profile i WHERE i.id = profile.id);
DELETE FROM search_history WHERE NOT EXISTS (SELECT 1 FROM incoming_search i WHERE i.id = search_history.id);
DELETE FROM ratings WHERE NOT EXISTS
  (SELECT 1 FROM incoming_entries i WHERE i.id = ratings.entry_id AND json_type(i.data, '$.personalRating') = 'integer');
-- Delete changed positions before inserting so swaps never collide with UNIQUE.
DELETE FROM custom_list_entries WHERE NOT EXISTS
  (SELECT 1 FROM incoming_members i WHERE i.list_id = custom_list_entries.list_id
    AND i.entry_id = custom_list_entries.entry_id AND i.position = custom_list_entries.position);

INSERT INTO anime_metadata
SELECT anilist_id, json_extract(data,'$.cachedMetadata') FROM incoming_entries WHERE true
ON CONFLICT(anilist_id) DO UPDATE SET data = excluded.data WHERE anime_metadata.data IS NOT excluded.data;

INSERT INTO library_entries
SELECT id, anilist_id, json_extract(data,'$.personalStatus'), json_extract(data,'$.watchedEpisodes'),
  json_extract(data,'$.totalEpisodes'), data FROM incoming_entries WHERE true
ON CONFLICT(id) DO UPDATE SET anilist_id = excluded.anilist_id, status = excluded.status,
  watched = excluded.watched, total = excluded.total, data = excluded.data
WHERE library_entries.data IS NOT excluded.data;

DELETE FROM anime_metadata WHERE NOT EXISTS (SELECT 1 FROM incoming_entries i WHERE i.anilist_id = anime_metadata.anilist_id);

INSERT INTO ratings SELECT id, json_extract(data,'$.personalRating') FROM incoming_entries
WHERE json_type(data,'$.personalRating') = 'integer'
ON CONFLICT(entry_id) DO UPDATE SET value = excluded.value WHERE ratings.value IS NOT excluded.value;

INSERT INTO reviews SELECT id, json_extract(data,'$.review'),
  CASE WHEN json_extract(data,'$.reviewContainsSpoilers') = 1 THEN 1 ELSE 0 END,
  json_extract(data,'$.reviewPrivacy') FROM incoming_entries WHERE true
ON CONFLICT(entry_id) DO UPDATE SET body = excluded.body, spoiler = excluded.spoiler, privacy = excluded.privacy
WHERE reviews.body IS NOT excluded.body OR reviews.spoiler IS NOT excluded.spoiler OR reviews.privacy IS NOT excluded.privacy;

INSERT INTO custom_lists SELECT id, public_id, data FROM incoming_lists WHERE true
ON CONFLICT(id) DO UPDATE SET public_id = excluded.public_id, data = excluded.data WHERE custom_lists.data IS NOT excluded.data;
INSERT INTO custom_list_entries SELECT list_id, entry_id, position FROM incoming_members WHERE true
ON CONFLICT(list_id,entry_id) DO NOTHING;

INSERT INTO watch_history SELECT id, json_extract(data,'$.entryId'), json_extract(data,'$.at'), data FROM incoming_history WHERE true
ON CONFLICT(id) DO UPDATE SET entry_id = excluded.entry_id, at = excluded.at, data = excluded.data WHERE watch_history.data IS NOT excluded.data;
INSERT INTO sync_queue SELECT id, json_extract(data,'$.publicId'), data FROM incoming_queue WHERE true
ON CONFLICT(id) DO UPDATE SET public_id = excluded.public_id, data = excluded.data WHERE sync_queue.data IS NOT excluded.data;
INSERT INTO profile SELECT id, data FROM incoming_profile WHERE true
ON CONFLICT(id) DO UPDATE SET data = excluded.data WHERE profile.data IS NOT excluded.data;
INSERT INTO preferences SELECT key, data FROM incoming_preferences WHERE true
ON CONFLICT(key) DO UPDATE SET data = excluded.data WHERE preferences.data IS NOT excluded.data;
INSERT INTO search_history SELECT id, data FROM incoming_search WHERE true
ON CONFLICT(id) DO UPDATE SET data = excluded.data WHERE search_history.data IS NOT excluded.data;

DROP TABLE incoming_members;
DROP TABLE incoming_entries;
DROP TABLE incoming_lists;
DROP TABLE incoming_history;
DROP TABLE incoming_queue;
DROP TABLE incoming_profile;
DROP TABLE incoming_preferences;
DROP TABLE incoming_search;
