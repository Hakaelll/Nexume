import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createEntry, emptyData } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";

const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map((a) => ({
  ...a,
  coverImage: { large: `/demo/${a.id}-cover.jpg` },
  status: "FINISHED",
}));

test("Home rotates available episodes and scrolls every started anime", async ({
  page,
}) => {
  await page.clock.install();
  const data = emptyData();
  data.preferences.reducedMotion = true;
  data.entries = Array.from({ length: 10 }, (_, i) => {
    const e = createEntry(
      mapAnime({ ...sample[i % sample.length], id: 900000 + i }),
    );
    e.personalStatus = i === 9 ? "Paused" : "Watching";
    e.watchedEpisodes = 1;
    return e;
  });
  const waiting = data.entries[0];
  waiting.cachedMetadata.status = "RELEASING";
  waiting.cachedMetadata.nextAiringEpisode = {
    episode: 2,
    airingAt: Math.floor(Date.now() / 1000) + 7 * 86400,
  };
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: [],
            airingSchedules: [],
          },
        },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".continue-grid .anime-card")).toHaveCount(10);
  await expect(page.locator(".home-spotlight")).not.toHaveAttribute(
    "data-anime-id",
    String(waiting.anilistId),
  );
  const first = await page
    .locator(".home-spotlight")
    .getAttribute("data-anime-id");
  await page.getByRole("button", { name: "Scroll anime right" }).click();
  await expect
    .poll(() => page.locator(".continue-grid").evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
  await page.mouse.move(0, 0);
  await page.clock.runFor(31000);
  await expect(page.locator(".home-spotlight")).not.toHaveAttribute(
    "data-anime-id",
    first!,
  );
  await page.screenshot({ path: "test-results/home-shelf.png" });
});

test("Tonight illuminates candidates and reveals the selected anime without a roulette", async ({
  page,
}) => {
  const data = emptyData();
  data.preferences.section = "Recommend";
  data.entries = sample.slice(0, 3).map((a) => createEntry(mapAnime(a)));
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "What fits tonight?", exact: true })
    .click();
  await page.getByLabel("Time available").selectOption("any");
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(page.locator(".tonight-candidate.is-lit")).toHaveCount(1);
  await expect(page.locator(".recommendation-roulette")).toHaveCount(0);
  await expect(page.locator(".recommendation-result")).toBeVisible({
    timeout: 8000,
  });
  const chosen = await page
    .locator(".recommendation-result")
    .getAttribute("data-anime-id");
  await expect(page.locator(".tonight-candidate.is-lit")).toHaveAttribute(
    "data-anime-id",
    chosen!,
  );
  await page.screenshot({ path: "test-results/tonight-lights-result.png" });
});

test("season import fetches all pages, preserves progress and populates Calendar", async ({
  page,
}) => {
  const data = emptyData();
  data.preferences.section = "Discover";
  data.preferences.reducedMotion = true;
  data.entries = [createEntry(mapAnime(sample[0]))];
  data.entries[0].personalStatus = "Watching";
  data.entries[0].watchedEpisodes = 3;
  const requests: Record<string, unknown>[] = [];
  const airingAt = Math.floor(Date.now() / 1000) + 60;
  await page.addInitScript((state) => {
    if (!localStorage.getItem("nexume.preview.v1"))
      localStorage.setItem("nexume.preview.v1", JSON.stringify(state));
  }, data);
  await page.route("https://graphql.anilist.co", (route) => {
    const body = route.request().postDataJSON();
    requests.push(body.variables);
    const schedule = body.query.includes("airingSchedules");
    return route.fulfill({
      json: {
        data: {
          Page: schedule
            ? {
                pageInfo: { hasNextPage: false },
                airingSchedules: [{ media: sample[1], episode: 1, airingAt }],
              }
            : {
                pageInfo: {
                  hasNextPage:
                    !!body.variables.season && body.variables.page === 1,
                },
                media:
                  body.variables.page === 2
                    ? [sample[1], sample[2]]
                    : sample.slice(0, 2),
              },
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "This season", exact: true }).click();
  await page
    .getByRole("button", { name: "Add all current season anime to Watchlist" })
    .click();
  await expect(page.locator(".discover-page > p[role=status]")).toContainText(
    "added to your Watchlist",
    { timeout: 20000 },
  );
  expect(requests.some((r) => r.season && r.page === 2)).toBe(true);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nexume.preview.v1")!),
  );
  expect(saved.entries).toHaveLength(3);
  expect(
    saved.entries.find(
      (e: { anilistId: number }) => e.anilistId === sample[0].id,
    ),
  ).toMatchObject({ personalStatus: "Watching", watchedEpisodes: 3 });
  await page
    .getByRole("button", { name: "Add all current season anime to Watchlist" })
    .click();
  await expect(page.locator(".discover-page > p[role=status]")).toContainText(
    "added to your Watchlist",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".calendar-episode")).toHaveCount(1);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "Next season", exact: true }).click();
  await page
    .getByRole("button", { name: "Add all next season anime to Watchlist" })
    .click();
  await expect(page.locator(".discover-page > p[role=status]")).toContainText(
    "added to your Watchlist",
    { timeout: 20000 },
  );
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("nexume.preview.v1")!).entries.length,
    ),
  ).toBe(3);
});

test("navigation keeps only three recent pages mounted", async ({ page }) => {
  const data = emptyData();
  data.preferences.reducedMotion = true;
  data.entries = sample.slice(0, 3).map((a) => createEntry(mapAnime(a)));
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: [],
            airingSchedules: [],
          },
        },
      },
    }),
  );
  await page.goto("/");
  for (const section of [
    "Stats",
    "Diary",
    "Watchlist",
    "Discover",
    "Calendar",
    "Home",
  ]) {
    await page
      .getByRole("button", { name: section, exact: true })
      .first()
      .click();
    await expect(
      page.locator(".route-panel:not([hidden]) .page-title h1"),
    ).toBeVisible();
    await expect
      .poll(() => page.locator(".route-panel").count())
      .toBeLessThanOrEqual(3);
    await expect(
      page.locator(".route-panel:not([hidden]) .scene-loading .skeleton-grid"),
    ).toHaveCount(0);
  }
});
