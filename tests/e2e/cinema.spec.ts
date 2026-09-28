import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createEntry, emptyData } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
const sample = JSON.parse(
  readFileSync("public/demo/anime.json", "utf8"),
) as AniListDTO[];
async function seed(
  page: Page,
  section: "Library" | "Watchlist" | "Home" = "Watchlist",
) {
  const data = emptyData();
  data.entries = sample.slice(0, 6).map((a, i) => {
    const e = createEntry(
      mapAnime({ ...a, coverImage: { large: `/demo/${a.id}-cover.jpg` } }),
    );
    e.coverImage = `/demo/${a.id}-cover.jpg`;
    e.cachedMetadata.duration = 25;
    e.cachedMetadata.format = "TV";
    e.cachedMetadata.isAdult = false;
    e.totalEpisodes = 12;
    e.priority = i === 0 ? 3 : 0;
    return e;
  });
  data.preferences.section = section;
  data.preferences.view = "Grid";
  data.preferences.motionMode = "full";
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: {
          Page: {
            media: [],
            airingSchedules: [],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  return data;
}
test("Watchlist keeps filters, scroll and keyboard focus after a detail visit", async ({
  page,
}) => {
  const data = await seed(page);
  await page
    .getByRole("textbox", { name: "Search Watchlist" })
    .fill(data.entries[0].preferredTitle);
  const cover = page.getByRole("button", {
    name: `Open ${data.entries[0].preferredTitle}`,
    exact: true,
  });
  await cover.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Back to Watchlist" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Search Watchlist" }),
  ).toHaveValue(data.entries[0].preferredTitle);
  await expect(cover).toBeFocused();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Watchlist", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Search Watchlist" }),
  ).toHaveValue(data.entries[0].preferredTitle);
});
test("Library returns to the same scrolled card", async ({ page }) => {
  await seed(page, "Library");
  await page.setViewportSize({ width: 960, height: 640 });
  const card = page.locator(".anime-card .cover-button").last();
  await page.locator(".library-card-slot").last().scrollIntoViewIfNeeded();
  await card.focus();
  const scroll = await page
    .locator(".library-results")
    .evaluate((e) => e.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Back to Library" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await expect
    .poll(() => page.locator(".library-results").evaluate((e) => e.scrollTop))
    .toBe(scroll);
});
test("Discover preserves results and title filter when returning from a ficha", async ({
  page,
}) => {
  await seed(page);
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: {
          Page: { media: sample.slice(0, 3), pageInfo: { hasNextPage: false } },
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByPlaceholder("Find a title").fill("Cowboy");
  await expect(page.locator(".anime-card")).toHaveCount(3);
  await page.locator(".cover-button").first().click();
  await page.getByRole("button", { name: "Back to Discover" }).click();
  await expect(page.getByPlaceholder("Find a title")).toHaveValue("Cowboy");
  await expect(page.locator(".anime-card")).toHaveCount(3);
});
test("failed episode saves leave the protagonist unchanged and show no success", async ({
  page,
}) => {
  await seed(page, "Home");
  await page
    .getByRole("button", { name: "What fits tonight?", exact: true })
    .click();
  await page
    .locator(".tonight-candidate")
    .first()
    .getByRole("button", { name: "Start watching" })
    .click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log episode", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Disk full test");
    };
  });
  await page.getByRole("button", { name: "Log episode", exact: true }).click();
  await expect(page.locator(".save-error")).toContainText(
    "Changes were not saved",
  );
  await expect(page.locator(".spotlight-copy")).toContainText(
    "0 episodes watched",
  );
  await expect(page.locator(".spotlight-feedback")).toHaveText("");
});
test("guided recommendations fit time, preserve the drawn winner on skip, and start without logging", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Pick for me" }).click();
  // Every matching title is shown in the scrollable candidates grid.
  await expect(page.locator(".tonight-candidate")).toHaveCount(6);
  await page.getByLabel("Time available").selectOption("50");
  await expect(page.locator(".tonight-candidate").first()).toContainText(
    "2 episodes fit in 50 minutes",
  );
  await page.screenshot({
    path: "test-results/cinema-tonight.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  const winner = await page
    .locator(".tonight-candidate")
    .first()
    .getAttribute("data-anime-id");
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(page.locator(".roulette-card")).toHaveCount(0);
  await expect(page.locator(".tonight-candidate.is-lit")).toHaveCount(1);
  await page.getByRole("button", { name: "Skip animation" }).click();
  await expect(page.locator(".recommendation-result")).toHaveAttribute(
    "data-anime-id",
    winner!,
  );
  await page
    .locator(".recommendation-result")
    .getByRole("button", { name: "View anime" })
    .click();
  await page.getByRole("button", { name: "Back to Recommend" }).click();
  await expect(page.locator(".recommendation-result")).toHaveAttribute(
    "data-anime-id",
    winner!,
  );
  const candidate = page.locator(".tonight-candidate").first();
  const animeId = Number(await candidate.getAttribute("data-anime-id"));
  await candidate.getByRole("button", { name: "Start watching" }).click();
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const e = JSON.parse(
          localStorage.getItem("nexume.preview.v1")!,
        ).entries.find((e: { anilistId: number }) => e.anilistId === id);
        return [e.personalStatus, e.watchedEpisodes];
      }, animeId),
    )
    .toEqual(["Watching", 0]);
});
test("current layouts fit both window sizes and reduced motion removes cinematic movement", async ({
  page,
}) => {
  await seed(page, "Home");
  for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: width === 960 ? 640 : 1000 });
    await expect(page.locator(".home-spotlight")).toBeVisible();
    expect(
      await page
        .locator("main")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/cinema-home-${width}.png` });
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Animations", { exact: true }).selectOption("reduced");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".spotlight-copy")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "What fits tonight?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(page.locator(".recommendation-result")).toBeVisible();
  await expect(page.locator(".roulette-track")).toHaveCount(0);
});
