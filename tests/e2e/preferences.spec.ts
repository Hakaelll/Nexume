import { test, expect } from "@playwright/test";
import { emptyData, createEntry } from "../../src/domain/model";
import { mapAnime } from "../../src/services/anilist/provider";

test("persists both themes and languages and searches local titles offline", async ({
  page,
  context,
}) => {
  const data = emptyData();
  data.entries = [
    createEntry(
      mapAnime({
        id: 42,
        title: { romaji: "Local long anime title" },
        episodes: 12,
      }),
    ),
  ];
  data.preferences.section = "Settings";
  data.preferences.language = "en";
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Language", { exact: true }).selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".page-title h1")).toHaveText("Ajustes");
  await page.getByLabel("Tema", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Idioma", { exact: true }).selectOption("en");
  await context.setOffline(true);
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search AniList" })
    .fill("Local long");
  await expect(page.locator(".search-results")).toContainText(
    "Local long anime title",
  );
  await expect(page.locator(".search-results")).toContainText("Your library");
});

test("failed review saves retain the draft and rewatch requires confirmation", async ({
  page,
}) => {
  const data = emptyData();
  const entry = {
    ...createEntry(
      mapAnime({ id: 42, title: { romaji: "Tracked anime" }, episodes: 12 }),
    ),
    personalStatus: "Completed" as const,
    watchedEpisodes: 12,
  };
  data.entries = [entry];
  Object.assign(data.preferences, {
    section: "Library",
    view: "Grid",
    language: "en",
  });
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Tracked anime", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start a rewatch", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "resets episode progress to zero",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Personal status")).toHaveValue("Completed");
  await page
    .getByRole("button", { name: "Write a thought", exact: true })
    .click();
  await page.getByLabel("Quick thought").fill("Keep this unsaved draft");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Disk full test");
    };
  });
  await page
    .getByRole("button", { name: "Save your words", exact: true })
    .click();
  await expect(page.locator(".save-error")).toContainText(
    "Changes were not saved",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Quick thought")).toHaveValue(
    "Keep this unsaved draft",
  );
});

test("long titles reflow at desktop sizes and the 200-percent zoom equivalent", async ({
  page,
}) => {
  const data = emptyData();
  data.entries = [
    createEntry(
      mapAnime({
        id: 42,
        title: {
          romaji:
            "A very long anime title that must remain understandable throughout the collection and detail view",
        },
        episodes: 12,
      }),
    ),
  ];
  Object.assign(data.preferences, {
    section: "Library",
    view: "Grid",
    language: "es",
    theme: "dark",
  });
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  for (const [width, height] of [
    [960, 640],
    [1440, 1000],
    [1920, 1080],
    [480, 320],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".card-title button")).toHaveAttribute(
      "title",
      data.entries[0].preferredTitle,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});

test("Home opens tonight mode even after a retained For you visit", async ({
  page,
}) => {
  const data = emptyData();
  data.entries = [
    createEntry(
      mapAnime({
        id: 42,
        title: { romaji: "Tonight anime" },
        episodes: 12,
        duration: 24,
        status: "FINISHED",
      }),
    ),
  ];
  Object.assign(data.preferences, { section: "Recommend", language: "en" });
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
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.goto("/");
  await expect(page.locator(".for-you")).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "What fits tonight?", exact: true })
    .click();
  await expect(page.locator(".tonight-candidate")).toContainText(
    "Tonight anime",
  );
  await expect(page.locator(".for-you")).toHaveCount(0);
});
