import { createServer, preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

// Run after building both versions; the approved baseline lives outside Git.
const loader = await createServer({
  configLoader: "native",
  server: { middlewareMode: true },
});
const { fixture } = await loader.ssrLoadModule("/tests/e2e/qhd-fixture.ts");
await loader.close();
const servers = [];
let browser;
const rows = [];
try {
  for (const [port, outDir] of [
    [1421, ".tools/qhd-baseline/dist"],
    [1420, "dist"],
  ]) {
    servers.push(
      await preview({
        configLoader: "native",
        build: { outDir },
        preview: { host: "127.0.0.1", port, strictPort: true },
      }),
    );
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const count of [100, 500, 1000]) {
    for (const section of ["Home", "Watchlist"]) {
      const data = fixture(count, section);
      for (let round = -1; round < 5; round++) {
        for (const version of round % 2
          ? ["current", "previous"]
          : ["previous", "current"]) {
          const context = await browser.newContext({
            viewport: { width: 2560, height: 1440 },
            deviceScaleFactor: 1,
            locale: "en-US",
          });
          try {
            const page = await context.newPage();
            page.setDefaultTimeout(15000);
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            await page.addInitScript(
              (state) =>
                localStorage.setItem(
                  "nexume.preview.v1",
                  JSON.stringify(state),
                ),
              data,
            );
            await page.route("https://graphql.anilist.co", (route) =>
              route.fulfill({
                json: {
                  data: {
                    Page: { media: [], pageInfo: { hasNextPage: false } },
                  },
                },
              }),
            );
            const start = performance.now();
            await page.goto(
              `http://127.0.0.1:${version === "current" ? 1420 : 1421}/`,
            );
            await page.locator(".splash").waitFor({ state: "detached" });
            await page.evaluate(() => document.fonts.ready);
            const root = page.locator(
              section === "Home" ? ".continue-grid" : ".watchlist-grid",
            );
            await root
              .locator("img")
              .first()
              .evaluate((image) => image.decode());
            const loadMs = performance.now() - start;
            if ((await root.locator(".anime-card").count()) !== count)
              throw new Error("Fixture did not render all titles");
            const fullCards =
              (await root.locator(".card-actions button").count()) / 4;
            const nodes = await page.locator("main *").count();
            const profiler = await context.newCDPSession(page);
            await profiler.send("HeapProfiler.collectGarbage");
            const { usedSize } = await profiler.send("Runtime.getHeapUsage");
            await profiler.detach();
            const navigationMs = await page.evaluate(
              () =>
                new Promise((resolve) => {
                  const started = performance.now();
                  const observer = new MutationObserver(() => {
                    if (!document.querySelector(".detail-info h1")) return;
                    observer.disconnect();
                    requestAnimationFrame(() =>
                      resolve(performance.now() - started),
                    );
                  });
                  observer.observe(document.body, {
                    subtree: true,
                    childList: true,
                  });
                  document.querySelector(".cover-button").click();
                }),
            );
            await page.locator(".detail-info h1").waitFor();
            await page.locator(".episode-control .plus").click();
            await page.waitForFunction(() =>
              JSON.parse(
                localStorage.getItem("nexume.preview.v1"),
              ).entries.some((entry) => entry.watchedEpisodes === 1),
            );
            if (errors.length) throw new Error(errors.join("; "));
            if (round >= 0)
              rows.push({
                count,
                section,
                round,
                version,
                loadMs,
                navigationMs,
                heapMiB: usedSize / 1048576,
                fullCards,
                nodes,
                errors: errors.length,
              });
          } finally {
            await context.close();
          }
        }
      }
      console.log(
        `${section}: completed five alternating samples per version with ${count} titles`,
      );
    }
  }
  const median = (values) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = [];
  for (const count of [100, 500, 1000])
    for (const section of ["Home", "Watchlist"])
      for (const version of ["previous", "current"]) {
        const samples = rows.filter(
          (row) =>
            row.count === count &&
            row.section === section &&
            row.version === version,
        );
        const result = { count, section, version, samples: samples.length };
        for (const key of [
          "loadMs",
          "navigationMs",
          "heapMiB",
          "fullCards",
          "nodes",
        ]) {
          const values = samples.map((row) => row[key]);
          result[key] = {
            median: median(values),
            min: Math.min(...values),
            max: Math.max(...values),
          };
        }
        summary.push(result);
      }
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/qhd-performance.json",
    JSON.stringify(
      {
        environment:
          "Production frontend, Edge headless, QHD 100%, local covers, isolated contexts, reduced motion. Load includes automation overhead; navigation measures dispatch to the next frame containing the detail title. Browser persistence is verified. These are not native WebView2 or GPU timings.",
        rows,
        summary,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary));
} finally {
  await browser?.close();
  for (const server of servers)
    await new Promise((resolve) => server.httpServer.close(resolve));
}
