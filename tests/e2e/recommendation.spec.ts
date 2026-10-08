import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(readFileSync("public/demo/anime.json", "utf8"));
test("filtered random selection, Watchlist actions, compact search and visual statistics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/^https:\/\/graphql\.anilist\.co\/?$/, (route) =>
    route.fulfill({
      json: {
        data: {
          Page: { pageInfo: { hasNextPage: false }, media: [sample[0]] },
        },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  expect(
    (await page.locator(".topbar").boundingBox())!.height,
  ).toBeLessThanOrEqual(56);
  await page.getByRole("button", { name: "Recommend", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore & shuffle", exact: true })
    .click();
  await page.getByLabel("Choose from").selectOption("Sample catalog");
  await page
    .getByRole("combobox", { name: "Genre", exact: true })
    .selectOption("Action");
  await page.getByLabel("Max episodes").fill("26");
  await expect(
    page.getByRole("button", { name: "Pick an anime", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Choosing…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator(".recommendation-result.is-revealed"),
  ).toBeVisible();
  const first = await page.locator(".recommendation-copy h2").innerText();
  expect(first).toBeTruthy();
  await expect(page.locator(".recommendation-copy")).toContainText("Action");
  await page.screenshot({ path: "test-results/recommendation.png" });
  await page
    .getByRole("button", { name: "Add to Watchlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "In your library", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Watchlist", exact: true }).click();
  await expect(page.locator(".watchlist-grid .anime-card")).toHaveCount(1);
  await expect(page.locator(".watchlist-grid")).toContainText(first);
  await page.screenshot({ path: "test-results/watchlist.png" });
  await page.reload();
  await expect(page.locator(".watchlist-grid .anime-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Start watching", exact: true })
    .click();
  await expect(page.locator(".watchlist-grid .anime-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page.locator(".donut-total")).toHaveText("1");
  await expect(page.locator(".activity-chart")).toBeVisible();
  await page.getByRole("button", { name: "6 months", exact: true }).click();
  await expect(page.locator(".activity-chart circle")).toHaveCount(6);
  await page.screenshot({ path: "test-results/statistics.png" });
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog").getByRole("combobox").fill("Cowboy Bebop");
  await expect(page.getByRole("dialog")).toContainText("Cowboy Bebop");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Recommend", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore & shuffle", exact: true })
    .click();
  await page.getByLabel("Choose from").selectOption("Sample catalog");
  await page.getByLabel("Released since").fill("2099");
  await expect(
    page.getByRole("button", { name: "Pick an anime", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".recommendation-empty")).toContainText(
    "No matching",
  );
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Genre", exact: true })
    .selectOption("Drama");
  await expect(page.locator(".recommendation-result")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pick an anime", exact: true }),
  ).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(
    page.locator(".recommendation-result.is-revealed"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("statistics charts represent a populated local diary", async ({
  page,
}) => {
  const { emptyData, createEntry } = await import("../../src/domain/model");
  const { mapAnime } = await import("../../src/services/anilist/provider");
  const { event } = await import("../../src/domain/rules");
  const data = emptyData();
  data.entries = sample.map(
    (dto: Parameters<typeof mapAnime>[0], i: number) => ({
      ...createEntry(mapAnime(dto)),
      coverImage: `/demo/${dto.id}-cover.jpg`,
      personalStatus: i < 4 ? ("Watching" as const) : ("Completed" as const),
      personalRating: 5 + (i % 6),
      watchedEpisodes: i < 4 ? 5 : (dto.episodes ?? 0),
    }),
  );
  data.preferences.section = "Stats";
  data.history = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setDate(10);
    date.setMonth(date.getMonth() - 11 + i);
    return {
      ...event(
        data.entries[0].localId,
        "episode",
        "Fixture progress",
        [6, 12, 8, 18, 30, 22, 14, 20, 16, 38, 25, 32][i],
      ),
      at: date.toISOString(),
    };
  });
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await expect(page.locator(".donut-total")).toHaveText("12");
  await expect(page.locator(".activity-chart")).toHaveAttribute(
    "aria-label",
    /32/,
  );
  await expect(page.locator(".rating-histogram")).toHaveAttribute(
    "aria-label",
    /5 stars: 2/,
  );
  await page.screenshot({ path: "test-results/statistics-populated.png" });
});
