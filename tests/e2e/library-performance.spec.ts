import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { emptyData, createEntry } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";

test("500-title grid mounts nearby cards, loads covers and restores navigation", async ({
  page,
}, testInfo) => {
  const sample = JSON.parse(
    readFileSync("public/demo/anime.json", "utf8"),
  ) as AniListDTO[];
  const data = emptyData();
  data.entries = Array.from({ length: 500 }, (_, i) => {
    const dto = sample[i % sample.length];
    return createEntry(
      mapAnime({
        ...dto,
        id: 100000 + i,
        title: { romaji: `Anime ${String(i).padStart(3, "0")}` },
        coverImage: {
          large: `/demo/${dto.id}-cover.jpg`,
          extraLarge: `/demo/${dto.id}-cover.jpg`,
        },
      }),
    );
  });
  Object.assign(data.preferences, {
    section: "Library",
    view: "Grid",
    sort: "title",
    descending: false,
    motionMode: "reduced",
  });
  await page.addInitScript((state) => {
    localStorage.setItem("nexume.preview.v1", JSON.stringify(state));
  }, data);
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
  const started = Date.now();
  await page.goto("/");
  const grid = page.locator(".library-results .poster-grid");
  await expect(grid.locator(".anime-card")).toHaveCount(500);
  await expect(grid.locator("img").first()).toBeVisible();
  await expect
    .poll(() =>
      grid
        .locator("img")
        .first()
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const mounted = (await grid.locator(".card-actions button").count()) / 4;
  expect(mounted).toBeLessThan(100);
  expect(mounted).toBeGreaterThan(0);
  const initialLoadMs = Date.now() - started;
  const initialNodes = await grid.locator("*").count();
  let peakMountedCards = mounted;
  // Visit the entire grid. Full cards must not accumulate after a long scroll.
  for (let index = 0; index < 500; index += 10) {
    const card = grid.locator(".anime-card").nth(index);
    await grid
      .locator(".library-card-slot")
      .nth(index)
      .scrollIntoViewIfNeeded();
    await expect(card.locator(".card-actions button")).toHaveCount(4);
    const count = (await grid.locator(".card-actions button").count()) / 4;
    peakMountedCards = Math.max(peakMountedCards, count);
    expect(count).toBeLessThan(100);
  }
  // Scrolling the background cannot close a rating editor on a distant card.
  await grid.locator(".library-card-slot").first().scrollIntoViewIfNeeded();
  await grid
    .getByRole("button", { name: "Rate Anime 000", exact: true })
    .click();
  await page.locator(".library-results").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Rate 3.5 stars", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("slider")).toHaveAttribute(
    "aria-valuenow",
    "3.5",
  );
  await page.keyboard.press("Escape");
  // Keyboard focus must survive a distant placeholder becoming a full card.
  await grid.locator(".anime-card").nth(250).locator(".cover-button").focus();
  await expect(
    grid.locator(".anime-card").nth(250).locator("img"),
  ).toBeVisible();
  await expect(
    grid.locator(".anime-card").nth(250).locator(".cover-button"),
  ).toBeFocused();
  await page.locator(".library-results").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const last = grid.locator(".anime-card").last();
  await expect(last.locator("img")).toBeVisible();
  await last
    .getByRole("button", { name: "Open Anime 499", exact: true })
    .click();
  await expect(page.locator(".detail-hero")).toBeVisible();
  await page.locator(".back-button").click();
  await expect(last).toBeVisible();
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(last).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search your library" })
    .fill("Anime 499");
  await expect(grid.locator(".anime-card")).toHaveCount(1);
  await expect(grid.locator(".card-title")).toContainText("Anime 499");
  await grid
    .getByRole("button", { name: "Like Anime 499", exact: true })
    .click();
  await expect(
    grid.getByRole("button", { name: "Like Anime 499", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await grid
    .getByRole("button", { name: "Rate Anime 499", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Rate 4.5 stars", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("slider")).toHaveAttribute(
    "aria-valuenow",
    "4.5",
  );
  await page.keyboard.press("Escape");
  await grid.locator(".anime-card").click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  const evidence = {
    titles: 500,
    initiallyMountedCards: mounted,
    initialLoadMs,
    initialNodes,
    peakMountedCards,
  };
  writeFileSync(
    "test-results/library-performance.json",
    JSON.stringify(evidence, null, 2),
  );
  await testInfo.attach("grid-performance", {
    body: JSON.stringify(evidence),
    contentType: "application/json",
  });
});
