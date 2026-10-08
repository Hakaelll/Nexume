import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { emptyData, createEntry, type AppData } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map((a) => ({ ...a, coverImage: { large: `/demo/${a.id}-cover.jpg` } }));

for (const width of [960, 1440]) {
  test(`Playful screens fit ${width}px and profile remains accessible from its photo`, async ({
    page,
  }) => {
    const data = emptyData();
    data.entries = sample.map((a, i) => ({
      ...createEntry(mapAnime(a)),
      personalStatus: i < 4 ? ("Watching" as const) : ("Planning" as const),
    }));
    data.preferences = {
      ...data.preferences,
      view: "Grid",
      reducedMotion: true,
    };
    data.profile.avatar = "/demo/1-cover.jpg";
    await page.addInitScript(
      (state: AppData) =>
        localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
      data,
    );
    await page.route("https://graphql.anilist.co", (route) =>
      route.fulfill({
        json: {
          data: { Page: { media: sample, pageInfo: { hasNextPage: false } } },
        },
      }),
    );
    await page.setViewportSize({ width, height: width === 960 ? 640 : 1000 });
    await page.goto("/");
    await expect(page.locator(".splash")).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: "Profile", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Your profile" }).locator("img"),
    ).toBeVisible();
    for (const name of [
      "Home",
      "Library",
      "Watchlist",
      "Recommend",
      "Discover",
      "Diary",
      "Calendar",
      "Lists",
      "Stats",
      "Your profile",
      "Settings",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const main = page.locator("main");
      expect(
        await main.evaluate((el) => el.scrollWidth - el.clientWidth),
        `${name} must not overflow horizontally`,
      ).toBeLessThanOrEqual(1);
      const nav = await page.locator(".nav-rail").boundingBox();
      const content = await main.boundingBox();
      expect(content!.x).toBeGreaterThanOrEqual(nav!.x + nav!.width);
      const heading = await page.locator("main h1").first().boundingBox();
      expect(
        heading!.x + heading!.width,
        `${name} heading fits`,
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `test-results/playful-${width}-${name.replaceAll(" ", "-")}.png`,
      });
    }
    await page.getByRole("button", { name: "Recommend", exact: true }).click();
    await page
      .getByRole("button", { name: "Explore & shuffle", exact: true })
      .click();
    await page.getByLabel("Choose from").selectOption("Sample catalog");
    await page
      .getByRole("button", { name: "Pick an anime", exact: true })
      .click();
    await expect(
      page.locator(".recommendation-result.is-revealed"),
    ).toBeVisible();
    const result = page.locator(".recommendation-result");
    const art = await result.locator(".artwork").boundingBox();
    const copy = await result.locator(".recommendation-copy").boundingBox();
    expect(art!.x + art!.width).toBeLessThan(copy!.x);
    await page
      .getByRole("button", { name: "Your profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const modal = await page.getByRole("dialog").boundingBox();
    expect(modal!.x).toBeGreaterThanOrEqual(0);
    expect(modal!.x + modal!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
  });
}
