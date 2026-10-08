import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { emptyData, createEntry } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";

test("compare local collection latency against the previous checkout", async ({
  browser,
}) => {
  test.skip(
    process.env.NEXUME_COMPARE !== "1",
    "Opt-in benchmark requires the previous checkout on port 1421",
  );
  test.setTimeout(420000);
  const sample = JSON.parse(
    readFileSync("public/demo/anime.json", "utf8"),
  ) as AniListDTO[];
  const results: unknown[] = [];
  for (const count of [100, 500, 1000]) {
    const data = emptyData();
    data.entries = Array.from({ length: count }, (_, i) =>
      createEntry(
        mapAnime({
          ...sample[i % sample.length],
          id: 100000 + i,
          title: { romaji: `Anime ${i}` },
          coverImage: {
            large: `/demo/${sample[i % sample.length].id}-cover.jpg`,
            extraLarge: `/demo/${sample[i % sample.length].id}-cover.jpg`,
          },
          bannerImage: "",
        }),
      ),
    );
    Object.assign(data.preferences, {
      section: "Library",
      view: "Grid",
      language: "en",
      motionMode: "reduced",
    });
    for (let round = -1; round < 9; round++) {
      // Alternate ordering to avoid consistently giving either checkout a warm cache.
      for (const version of round % 2
        ? ["current", "previous"]
        : ["previous", "current"]) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        });
        const page = await context.newPage();
        await page.route("https://graphql.anilist.co", (route) =>
          route.fulfill({
            json: {
              data: { Page: { media: [], pageInfo: { hasNextPage: false } } },
            },
          }),
        );
        await page.addInitScript(
          (state) =>
            localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
          data,
        );
        let started = performance.now();
        await page.goto(
          `http://127.0.0.1:${version === "current" ? 1420 : 1421}/`,
        );
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() => document.fonts.check("14px Inter")),
        ).toBe(true);
        await expect(page.locator(".splash")).toHaveCount(0);
        await expect(page.locator(".cover-button").first()).toBeVisible();
        const loadMs = performance.now() - started;
        // Measure event-to-paint latency, excluding Playwright hover/stability waits.
        await page.waitForTimeout(150);
        const navigationMs = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const started = performance.now();
              const observe = new MutationObserver(() => {
                if (!document.querySelector(".detail-info h1")) return;
                observe.disconnect();
                requestAnimationFrame(() =>
                  resolve(performance.now() - started),
                );
              });
              observe.observe(document.body, {
                childList: true,
                subtree: true,
              });
              document
                .querySelector<HTMLButtonElement>(".cover-button")!
                .click();
            }),
        );
        started = performance.now();
        await page.locator(".episode-control .icon-button").last().click();
        await expect
          .poll(() =>
            page.evaluate(() =>
              JSON.parse(
                localStorage.getItem("nexume.preview.v1")!,
              ).entries.reduce(
                (total: number, entry: { watchedEpisodes: number }) =>
                  total + entry.watchedEpisodes,
                0,
              ),
            ),
          )
          .toBe(1);
        const saveMs = performance.now() - started;
        const frameMedianMs = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const frames: number[] = [];
              let previous = performance.now();
              const frame = (now: number) => {
                frames.push(now - previous);
                previous = now;
                if (frames.length < 35) requestAnimationFrame(frame);
                else {
                  const sorted = frames.slice(5).sort((a, b) => a - b);
                  resolve(sorted[Math.floor(sorted.length / 2)]);
                }
              };
              requestAnimationFrame(frame);
            }),
        );
        const profiler = await context.newCDPSession(page);
        await profiler.send("HeapProfiler.collectGarbage");
        const heap = await profiler.send("Runtime.getHeapUsage");
        const heapMB = heap.usedSize / 1048576;
        await profiler.detach();
        if (round >= 0)
          results.push({
            version,
            count,
            round,
            loadMs,
            navigationMs,
            saveMs,
            heapMB,
            frameMedianMs,
          });
        await context.close();
      }
    }
  }
  writeFileSync(
    "test-results/comparison.json",
    JSON.stringify(results, null, 2),
  );
});
