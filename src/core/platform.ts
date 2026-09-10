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
export function cachedImage(url: string): Promise<string> {
  if (!url) return Promise.resolve("");
  if (!native || url.startsWith("/")) return Promise.resolve(url);
  const known = imageCache.get(url);
  if (known) return known;
  const job = invoke<string>("cache_image", { url })
    .then(convertFileSrc)
    .catch(() => {
      imageCache.delete(url);
      return url;
    });
  imageCache.set(url, job);
  if (imageCache.size > 128) imageCache.delete(imageCache.keys().next().value!);
  return job;
}
