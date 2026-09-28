import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(readFileSync("public/demo/anime.json", "utf8"));
async function addSample(page: Page) {
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await expect(page.locator(".sample-covers img")).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator(".sample-covers img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/home-empty.png" });
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page
    .getByRole("button", { name: "Add sample collection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".home-spotlight")).toBeVisible();
  // Home includes all four ongoing sample titles, including the spotlight.
  await expect(page.locator(".continue-grid .anime-card")).toHaveCount(4);
}
test("offline-first library, rating, review, lists, profile and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await addSample(page);
  await page.screenshot({ path: "test-results/home.png", fullPage: true });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator(".collection-stage").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".collection-navigation>span")).toContainText("02");
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("dialog", { name: "Quick view", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/collection.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".poster-grid .anime-card")).toHaveCount(12);
  // The wider navigation creates another row. Exercise lazy artwork by scrolling.
  for (const card of await page.locator(".library-card-slot").all()) {
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluateAll(
            (images) =>
              images.length > 0 &&
              images.every(
                (image) => (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
      )
      .toBe(true);
  }
  await page.locator(".library-card-slot").first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".poster-grid .artwork img")
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/library-grid.png" });
  await page
    .getByRole("textbox", { name: "Search your library" })
    .fill("Cowboy");
  await expect(page.locator(".poster-grid .anime-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open Cowboy Bebop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rate 4.5 stars", exact: true })
    .click();
  await page.getByRole("button", { name: "Like anime", exact: true }).click();
  await page
    .getByRole("button", { name: "Write a thought", exact: true })
    .click();
  await page.getByLabel("Quick thought").fill("A memory worth keeping.");
  await page
    .getByLabel("Full review", { exact: true })
    .fill("An unforgettable journey through the stars.");
  await page.getByLabel("Private notes").fill("Private test note");
  await page.getByLabel("Contains spoilers").check();
  await page.getByRole("button", { name: "Save your words" }).click();
  await expect(page.locator(".detail-thought")).toContainText(
    "A memory worth keeping.",
  );
  await expect(
    page.getByRole("button", { name: "This review contains spoilers." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "This review contains spoilers." })
    .click();
  await expect(page.locator(".review")).toContainText(
    "An unforgettable journey",
  );
  await page.getByLabel("Watched episodes", { exact: true }).fill("26");
  await page.getByLabel("Watched episodes", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Mark as completed?" }).click();
  await expect(page.getByLabel("Personal status", { exact: true })).toHaveValue(
    "Completed",
  );
  await page.screenshot({ path: "test-results/detail.png", fullPage: true });
  await page.getByRole("button", { name: "Lists", exact: true }).click();
  await page
    .getByRole("button", { name: "Create a list", exact: true })
    .click();
  await page.getByLabel("List title").fill("Quiet nights");
  await page.getByRole("button", { name: "Create list", exact: true }).click();
  await page
    .getByRole("button", { name: "Add titles", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cowboy Bebop", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Death Note", exact: true })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".ranked-list article")).toHaveCount(2);
  await page.getByRole("button", { name: "Move Death Note up" }).click();
  await expect(page.locator(".ranked-info").first()).toContainText(
    "Death Note",
  );
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Not configured");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose favorites", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cowboy Bebop", exact: true })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".profile-favorites .anime-card")).toHaveCount(1);
  for (const name of ["Diary", "Calendar", "Stats", "Settings"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: name === "Stats" ? "Statistics" : name,
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
  }
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".library-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".library-table")).toContainText("4.5");
  await expect(page.locator(".connection")).toContainText("Offline");
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.locator(".library-table")).toContainText("Cowboy Bebop");
  await expect(page.locator(".library-table")).toContainText("4.5");
  expect(errors).toEqual([]);
});
test("AniList search, add, pagination and upstream error", async ({ page }) => {
  let requests = 0;
  await page.route(/^https:\/\/graphql\.anilist\.co\/?$/, (route) => {
    if (route.request().postDataJSON().variables.search) requests++;
    return route.fulfill({
      json: {
        data: {
          Page: { media: [sample[0]], pageInfo: { hasNextPage: false } },
        },
      },
    });
  });
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search AniList" }).fill("Cowboy");
  await expect(page.locator(".search-result")).toHaveCount(1);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Cowboy Bebop to Watchlist" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Cowboy Bebop is in your library" }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  await page.getByRole("combobox", { name: "Search AniList" }).press("Enter");
  await expect(page.locator(".detail-info h1")).toHaveText("Cowboy Bebop");
  await page.unroute(/^https:\/\/graphql\.anilist\.co\/?$/);
  await page.route(/^https:\/\/graphql\.anilist\.co\/?$/, (route) =>
    route.fulfill({
      status: 403,
      json: {
        errors: [
          {
            message:
              "The AniList API has been temporarily disabled due to severe stability issues.",
          },
        ],
        data: null,
      },
    }),
  );
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search AniList" }).fill("Monster");
  await expect(page.getByRole("alert")).toContainText("temporarily disabled");
});
test("collection fits desktop sizes and recovers from context loss", async ({
  page,
}) => {
  await addSample(page);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3440, 1440],
    [960, 640],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("canvas")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".collection-stage").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".collection-navigation>span")).toContainText("02");
  await page
    .locator("canvas")
    .evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByRole("button", { name: "Grid", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".poster-grid .anime-card")).toHaveCount(12);
});
