import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(readFileSync("public/demo/anime.json", "utf8")).map(
  (a: { id: number; coverImage: unknown }) => ({
    ...a,
    coverImage: { large: `/demo/${a.id}-cover.jpg`, extraLarge: `/demo/${a.id}-cover.jpg` },
  }),
);

test("header searches partial titles, supports keyboard selection and clears stale results", async ({
  page,
}) => {
  await page.route(/^https:\/\/graphql\.anilist\.co\/?$/, (route) => {
    const search = route.request().postDataJSON().variables.search;
    return route.fulfill({
      json: {
        data: {
          Page: {
            media: search?.startsWith("cow") ? [sample[0]] : [],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  const search = page.getByRole("combobox", { name: "Search anime catalog" });
  await search.fill("cow");
  await expect(
    page.getByRole("option", { name: /Cowboy Bebop/ }),
  ).toBeVisible();
  await expect(page.locator(".header-suggestions img")).toHaveCount(1);
  await page.screenshot({ path: "test-results/header-typeahead.png" });
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.locator(".detail-info h1")).toHaveText("Cowboy Bebop");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await search.fill("cow");
  await expect(page.getByRole("option")).toHaveCount(1);
  await search.fill("zzzz");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.locator(".header-suggestions")).toContainText(
    "No anime found.",
  );
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
});

test("Discover renders every cover and title; table header stays inside its scroll area", async ({
  page,
}) => {
  await page.route(/^https:\/\/graphql\.anilist\.co\/?$/, (route) =>
    route.fulfill({
      json: {
        data: { Page: { media: sample, pageInfo: { hasNextPage: false } } },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator(".discover-page .card-title > button")).toHaveCount(
    12,
  );
  for (const card of await page.locator(".discover-page .anime-card").all()) {
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluateAll(
            (images) =>
              images.length === 1 &&
              (images[0] as HTMLImageElement).naturalWidth > 0,
          ),
      )
      .toBe(true);
  }
  await page.locator("#main").evaluate((element) => (element.scrollTop = 0));
  await page.screenshot({ path: "test-results/discover-refined.png" });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page
    .getByRole("button", { name: "Add sample collection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.setViewportSize({ width: 1100, height: 760 });
  await page
    .locator(".library-results")
    .evaluate((element) => (element.scrollTop = 200));
  await expect
    .poll(async () => {
      const result = await page.locator(".library-results").boundingBox();
      const header = await page
        .locator(".library-table th")
        .first()
        .boundingBox();
      return Math.abs(header!.y - result!.y);
    })
    .toBeLessThan(2);
  const results = (await page.locator(".library-results").boundingBox())!;
  expect(
    await page.evaluate(
      ({ x, y }) =>
        !!document.elementFromPoint(x, y)?.closest(".library-table"),
      { x: results.x + 100, y: results.y - 2 },
    ),
  ).toBe(false);
  await page.screenshot({ path: "test-results/library-list-scrolled.png" });
});
