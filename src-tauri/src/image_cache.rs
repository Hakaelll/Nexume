use crate::err;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::OnceLock,
    time::{Duration, SystemTime},
};
use tokio::sync::Mutex;

pub(crate) fn client() -> Result<&'static reqwest::Client, String> {
    static CLIENT: OnceLock<Result<reqwest::Client, String>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .timeout(Duration::from_secs(20))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .map_err(err)
        })
        .as_ref()
        .map_err(Clone::clone)
}

#[derive(Default)]
pub(crate) struct ImageCache {
    index: Mutex<Option<CacheIndex>>,
}
struct CacheIndex {
    files: HashMap<PathBuf, (u64, SystemTime)>,
    bytes: u64,
}
impl CacheIndex {
    async fn load(dir: &Path) -> Result<Self, String> {
        let mut index = Self {
            files: HashMap::new(),
            bytes: 0,
        };
        let mut files = tokio::fs::read_dir(dir).await.map_err(err)?;
        while let Some(file) = files.next_entry().await.map_err(err)? {
            if file.path().extension().is_none_or(|ext| ext != "img") {
                continue;
            }
            let metadata = file.metadata().await.map_err(err)?;
            if metadata.is_file() {
                index.bytes += metadata.len();
                index.files.insert(
                    file.path(),
                    (
                        metadata.len(),
                        metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
                    ),
                );
            }
        }
        Ok(index)
    }
    async fn trim(&mut self, protected: &Path, budget: u64) -> Result<(), String> {
        while self.bytes > budget {
            let oldest = self
                .files
                .iter()
                .filter(|(path, _)| path.as_path() != protected)
                .min_by_key(|(_, (_, modified))| *modified)
                .map(|(path, _)| path.clone());
            let Some(oldest) = oldest else {
                break;
            };
            match tokio::fs::remove_file(&oldest).await {
                Ok(()) => (),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
                Err(error) => return Err(err(error)),
            }
            if let Some((size, _)) = self.files.remove(&oldest) {
                self.bytes -= size;
            }
        }
        Ok(())
    }
}
impl ImageCache {
    pub(crate) async fn commit(
        &self,
        dir: &Path,
        key: &str,
        bytes: &[u8],
        budget: u64,
    ) -> Result<PathBuf, String> {
        // Downloads run concurrently, but publication and eviction share a lock.
        // A second request for the same URL cannot overwrite its temporary file.
        let mut state = self.index.lock().await;
        if state.is_none() {
            *state = Some(CacheIndex::load(dir).await?);
        }
        let index = state.as_mut().unwrap();
        let path = dir.join(format!("{key}.img"));
        if tokio::fs::try_exists(&path).await.map_err(err)? {
            return Ok(path);
        }
        let temp = dir.join(format!("{key}.tmp"));
        tokio::fs::write(&temp, bytes).await.map_err(err)?;
        tokio::fs::rename(&temp, &path).await.map_err(err)?;
        if let Some((previous, _)) = index
            .files
            .insert(path.clone(), (bytes.len() as u64, SystemTime::now()))
        {
            index.bytes -= previous;
        }
        index.bytes += bytes.len() as u64;
        index.trim(&path, budget).await?;
        Ok(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn requests_share_the_http_connection_pool() {
        assert!(std::ptr::eq(client().unwrap(), client().unwrap()));
    }
    #[tokio::test]
    async fn indexed_cache_preserves_downloads_and_obeys_the_budget() {
        let dir = std::env::temp_dir().join(format!(
            "nexume-cache-test-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        tokio::fs::write(dir.join("existing.img"), [1; 8])
            .await
            .unwrap();
        tokio::fs::write(dir.join("inflight.tmp"), [2; 8])
            .await
            .unwrap();
        let cache = ImageCache::default();
        let (first, duplicate) = tokio::join!(
            cache.commit(&dir, "one", &[3; 8], 16),
            cache.commit(&dir, "one", &[3; 8], 16)
        );
        assert_eq!(first.unwrap(), duplicate.unwrap());
        let last = cache.commit(&dir, "two", &[4; 8], 16).await.unwrap();
        assert_eq!(tokio::fs::read(last).await.unwrap(), vec![4; 8]);
        assert!(!dir.join("existing.img").exists());
        assert!(dir.join("inflight.tmp").exists());
        let state = cache.index.lock().await;
        assert_eq!(state.as_ref().unwrap().bytes, 16);
        assert_eq!(state.as_ref().unwrap().files.len(), 2);
        drop(state);
        // Remove only this test's uniquely named temporary directory.
        tokio::fs::remove_dir_all(&dir).await.unwrap();
    }
}
