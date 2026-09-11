import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(readFileSync("public/demo/anime.json", "utf8")).map(
  (a: { id: number }) => ({
    ...a,
    coverImage: { large: `/demo/${a.id}-cover.jpg` },
  }),
);

test("catalog quick actions persist ratings, likes and watched status without opening details", async ({
  page,
}) => {
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: { Page: { media: sample, pageInfo: { hasNextPage: false } } },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  const card = page.locator(".anime-card").first();
  await card
    .getByRole("button", { name: "Rate Cowboy Bebop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rate 4.5 stars", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("slider")).toHaveAttribute(
    "aria-valuenow",
    "4.5",
  );
  await page.keyboard.press("Escape");
  await card
    .getByRole("button", { name: "Like Cowboy Bebop", exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: "Like Cowboy Bebop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await card
    .getByRole("button", { name: "Mark Cowboy Bebop as watched" })
    .click();
  await expect(card.locator(".cover-status")).toHaveText("Completed");
  await expect(page.locator(".detail-info")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".splash")).toHaveCount(0);
  await expect(card.locator(".rating-number")).toHaveText("4.5");
  await expect(card.locator(".cover-status")).toHaveText("Completed");
  await page.screenshot({ path: "test-results/gallery-discover.png" });
});

test("all-anime draws use catalog IDs, cancel safely and reveal a result", async ({
  page,
}) => {
  let draws = 0;
  await page.route("https://graphql.anilist.co", (route) => {
    const body = route.request().postDataJSON();
    if (body.variables.ids) draws++;
    return route.fulfill({
      json: {
        data: {
          Page: {
            media: body.query.includes("sort:ID_DESC")
              ? [{ ...sample[0], id: 250000 }]
              : [sample[0]],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await page.getByRole("button", { name: "Recommend", exact: true }).click();
  await page.getByLabel("Choose from").selectOption("AniList");
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(
    page.locator(".recommendation-result.is-revealed"),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Pick another", exact: true }).click();
  await expect(
    page.locator(".recommendation-result.is-revealed"),
  ).toBeVisible({ timeout: 10000 });
  expect(draws).toBe(2);
  await page.screenshot({ path: "test-results/gallery-random.png" });
});
