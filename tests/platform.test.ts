import { expect, it, vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset:${path}`,
}));
import { invoke } from "@tauri-apps/api/core";
import { cachedImage } from "../src/core/platform";

it("bounds native image work and keeps queued URLs deduplicated beyond cache capacity", async () => {
  let active = 0,
    peak = 0;
  vi.mocked(invoke).mockImplementation(async (_command, args) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return (args as { url: string }).url;
  });
  const urls = Array.from(
    { length: 140 },
    (_, i) => `https://s4.anilist.co/${i}.jpg`,
  );
  const jobs = urls.map(cachedImage);
  expect(cachedImage(urls[0])).toBe(jobs[0]);
  const results = await Promise.all(jobs);
  expect(peak).toBe(4);
  expect(invoke).toHaveBeenCalledTimes(140);
  expect(results).toEqual(urls.map((url) => `asset:${url}`));
  await cachedImage(urls[139]);
  expect(invoke).toHaveBeenCalledTimes(140);
});

it("retries failed image requests and releases the queue slot", async () => {
  vi.mocked(invoke).mockRejectedValueOnce(new Error("offline"));
  const url = "https://s4.anilist.co/retry.jpg";
  expect(await cachedImage(url)).toBe(url);
  expect(await cachedImage(url)).toBe(`asset:${url}`);
});
