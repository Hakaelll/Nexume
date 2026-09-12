import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { emptyData, createEntry } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map((a) => ({
  ...a,
  coverImage: { large: `/demo/${a.id}-cover.jpg` },
  bannerImage: `/demo/${a.id}-cover.jpg`,
}));

test("relevant search, paper collection, banner, roulette landing and uploaded avatar persist", async ({
  page,
}) => {
  const data = emptyData();
  data.entries = sample.slice(0, 3).map((a) => createEntry(mapAnime(a)));
  data.entries[1].cachedMetadata.synonyms = ["Cowboy Bebop"];
  data.preferences.section = "Library";
  data.preferences.view = "Collection";
  await page.addInitScript((state) => {
    if (!localStorage.getItem("nexume.preview.v1"))
      localStorage.setItem("nexume.preview.v1", JSON.stringify(state));
  }, data);
  await page.route("https://graphql.anilist.co", (route) => {
    const body = route.request().postDataJSON();
    if (body.variables.search) expect(body.variables.sort).toBe("SEARCH_MATCH");
    return route.fulfill({
      json: {
        data: {
          Page: { media: [sample[0]], pageInfo: { hasNextPage: false } },
        },
      },
    });
  });
  await page.setViewportSize({ width: 960, height: 640 });
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  const stage = page.locator(".collection-stage");
  await expect(stage).toHaveCSS("background-color", "rgb(246, 242, 238)");
  for (const name of ["Previous anime", "Next anime"]) {
    const box = (await page
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    const frame = (await stage.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(frame.x + 20);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width - 20);
  }
  await page.screenshot({ path: "test-results/paper-collection.png" });
  await page.getByLabel("Search anime catalog").fill("Cowboy Bebop");
  await expect(
    page
      .getByRole("listbox", { name: "Search suggestions" })
      .getByRole("option"),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("listbox", { name: "Search suggestions" })
      .getByRole("option")
      .first(),
  ).toContainText("Cowboy Bebop");
  await page
    .getByRole("listbox", { name: "Search suggestions" })
    .getByRole("option")
    .first()
    .click();
  await expect(page.locator(".detail-hero .detail-banner img")).toBeVisible();
  await expect(page.locator(".detail-hero .star").first()).toHaveCSS(
    "width",
    "24px",
  );
  await page
    .locator(".detail-hero")
    .getByRole("button", { name: "Rate 3.5 stars", exact: true })
    .click();
  await expect(page.locator(".detail-hero .stars")).toHaveAttribute(
    "aria-valuenow",
    "3.5",
  );
  await page.screenshot({
    path: "test-results/detail-banner.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Recommend", exact: true }).click();
  await page.getByLabel("Choose from").selectOption("Library");
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  const cards = page.locator(".roulette-card");
  await expect(cards).toHaveCount(26);
  const selected = await cards.nth(22).locator("span").innerText();
  await page.screenshot({ path: "test-results/roulette.png" });
  await expect(page.locator(".recommendation-copy h2")).toHaveText(selected);
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page
    .getByLabel("Upload profile photo")
    .setInputFiles("public/demo/1-cover.jpg");
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".avatar-crop-controls img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page
      .getByRole("button", { name: "Your profile", exact: true })
      .locator("img"),
  ).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
});
