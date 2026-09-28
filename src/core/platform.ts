import { isTauri, invoke, convertFileSrc } from "@tauri-apps/api/core";
export const native = isTauri();
export async function saveText(filename: string, content: string) {
  if (native) {
    return invoke<boolean>("save_export", { filename, content });
  }
  const url = URL.createObjectURL(
    new Blob([content], {
      type: filename.endsWith(".csv") ? "text/csv" : "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export async function readBackupFile(): Promise<string | null> {
  if (native) return invoke<string | null>("read_backup");
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      if (f.size > 25 * 1024 * 1024) return resolve("Oversized backup");
      f.text().then(resolve);
    };
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}
const imageCache = new Map<string, Promise<string>>();
const pendingImages = new Map<string, Promise<string>>();
const imageWaiters: (() => void)[] = [];
let activeImages = 0;
async function resolveCachedImage(url: string) {
  if (activeImages >= 4)
    await new Promise<void>((resolve) => imageWaiters.push(resolve));
  else activeImages++;
  try {
    return convertFileSrc(await invoke<string>("cache_image", { url }));
  } finally {
    const next = imageWaiters.shift();
    if (next) next();
    else activeImages--;
  }
}
export function cachedImage(url: string): Promise<string> {
  if (!url) return Promise.resolve("");
  if (!native || url.startsWith("/") || url.startsWith("data:image/"))
    return Promise.resolve(url);
  const pending = pendingImages.get(url);
  if (pending) return pending;
  const known = imageCache.get(url);
  if (known) return known;
  const job = resolveCachedImage(url)
    .then((resolved) => {
      imageCache.set(url, Promise.resolve(resolved));
      if (imageCache.size > 128)
        imageCache.delete(imageCache.keys().next().value!);
      return resolved;
    })
    .catch(() => url)
    .finally(() => pendingImages.delete(url));
  pendingImages.set(url, job);
  return job;
}
