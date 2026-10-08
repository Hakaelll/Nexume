import { event } from "../../src/domain/rules";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { emptyData, createEntry } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
const sample = (
  JSON.parse(readFileSync("public/demo/anime.json", "utf8")) as AniListDTO[]
).map((a) => ({ ...a, coverImage: { large: `/demo/${a.id}-cover.jpg` } }));

test("calendar modes, today episodes, favorite search, avatar framing and discovery filters", async ({
  page,
}) => {
  const data = emptyData();
  data.preferences.reducedMotion = true;
  const today = new Date();
  today.setHours(18, 0, 0, 0);
  data.entries = sample.slice(0, 4).map((a) => ({
    ...createEntry(mapAnime(a)),
    personalStatus: "Watching" as const,
  }));
  data.history = [
    event(data.entries[0].localId, "episode", "Watched episode 6", 1),
    event(data.entries[1].localId, "rating", "Rated 4 stars"),
    event(data.entries[2].localId, "review", "Updated review"),
  ];
  data.entries[0].cachedMetadata.nextAiringEpisode = {
    airingAt: Math.floor(today.getTime() / 1000),
    episode: 7,
  };
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  const requests: Record<string, unknown>[] = [];
  await page.route("https://graphql.anilist.co", (route) => {
    const body = route.request().postDataJSON();
    requests.push(body.variables);
    return route.fulfill({
      json: {
        data: {
          Page: body.query.includes("airingSchedules")
            ? {
                pageInfo: { hasNextPage: false },
                airingSchedules: [
                  {
                    media: sample[0],
                    episode: 7,
                    airingAt: Math.floor(today.getTime() / 1000),
                  },
                ],
              }
            : { pageInfo: { hasNextPage: false }, media: sample },
        },
      },
    });
  });
  await page.setViewportSize({ width: 960, height: 640 });
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await expect(page.locator(".today-airing-card")).toHaveCount(1);
  await expect(page.locator(".today-airing-card")).toContainText(
    "Cowboy Bebop",
  );
  await expect(
    page.getByRole("heading", { name: "Recently watched", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Continue watching" }),
  ).toBeVisible();
  await expect(page.locator(".airing-timezone").first()).toContainText(
    "Local time",
  );
  await page.screenshot({ path: "test-results/home-today.png" });
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await expect(page.locator(".diary-event")).toHaveCount(3);
  await page.screenshot({ path: "test-results/diary-updated.png" });
  await page
    .getByRole("button", { name: "Calendar", exact: true })
    .first()
    .click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  expect(await page.locator(".calendar-day").count()).toBeGreaterThanOrEqual(
    28,
  );
  expect(await page.locator(".calendar-day").count()).toBeLessThanOrEqual(42);
  await expect(page.locator(".calendar-episode")).toHaveCount(1);
  await page.screenshot({ path: "test-results/calendar-month.png" });
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.locator(".calendar-episode")).toHaveCount(0);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose favorites", exact: true })
    .click();
  await page.getByLabel("Find an anime").fill("Evangelion");
  await expect(page.locator(".picker-list > button")).toHaveCount(1);
  await page.locator(".picker-list > button").click();
  await expect(page.locator(".picker-list > button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page
    .getByLabel("Upload profile photo")
    .setInputFiles("public/demo/1-cover.jpg");
  await expect(
    page.getByRole("img", { name: "Complete uploaded photo" }),
  ).toBeVisible();
  const circle = page.getByRole("button", { name: "Move photo selection" });
  const before = await circle.getAttribute("style");
  await page.getByLabel("Zoom", { exact: true }).focus();
  await page.keyboard.press("End");
  await expect(circle).not.toHaveAttribute("style", before!);
  await circle.scrollIntoViewIfNeeded();
  const box = (await circle.boundingBox())!;
  const beforeDrag = await circle.getAttribute("style");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 25,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(circle).not.toHaveAttribute("style", beforeDrag!);
  const afterDrag = await circle.getAttribute("style");
  await circle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(circle).not.toHaveAttribute("style", afterDrag!);
  await page.screenshot({ path: "test-results/avatar-crop.png" });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Minimum score", exact: true })
    .selectOption("80");
  await page
    .getByRole("combobox", { name: "Maximum episodes", exact: true })
    .selectOption("12");
  await expect
    .poll(() => requests.some((v) => v.score === 79 && v.episodes === 13))
    .toBe(true);
  expect(
    await page
      .locator(".main-content")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBe(true);
});

test("full animation override works when Windows requests reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: { data: { Page: { media: [], pageInfo: { hasNextPage: false } } } },
    }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Animations", { exact: true }).selectOption("full");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "false",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "false",
  );
  await page.getByRole("button", { name: "Recommend", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore & shuffle", exact: true })
    .click();
  await page.getByLabel("Choose from").selectOption("Sample catalog");
  await page
    .getByRole("button", { name: "Pick an anime", exact: true })
    .click();
  await expect(page.locator(".roulette-track")).toHaveCSS(
    "animation-name",
    "roulette-roll",
  );
  await expect(page.locator(".roulette-card")).toHaveCount(26);
  await expect(
    page.locator(".recommendation-result.is-revealed"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Animations", { exact: true }).selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
});

test("Home uses the computer's local day and time", async ({ browser }) => {
  const context = await browser.newContext({
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
  });
  const page = await context.newPage();
  try {
    await page.clock.setFixedTime(new Date("2026-07-10T23:30:00Z"));
    const data = emptyData();
    data.preferences.reducedMotion = true;
    await page.addInitScript(
      (value) =>
        localStorage.setItem("nexume.preview.v1", JSON.stringify(value)),
      data,
    );
    let bounds: Record<string, unknown> = {};
    await page.route("https://graphql.anilist.co", (route) => {
      const body = route.request().postDataJSON();
      if (body.query.includes("airingSchedules")) bounds = body.variables;
      return route.fulfill({
        json: {
          data: {
            Page: body.query.includes("airingSchedules")
              ? {
                  pageInfo: { hasNextPage: false },
                  airingSchedules: [
                    {
                      media: sample[0],
                      episode: 7,
                      airingAt: Date.parse("2026-07-10T23:00:00Z") / 1000,
                    },
                  ],
                }
              : { pageInfo: { hasNextPage: false }, media: [] },
          },
        },
      });
    });
    await page.goto("/");
    await expect(page.locator(".today-airing-card")).toContainText("04:00");
    await expect(page.locator(".airing-timezone").first()).toContainText(
      "America/Los_Angeles",
    );
    await expect
      .poll(() =>
        Object.values(bounds).includes(
          Date.parse("2026-07-10T07:00:00Z") / 1000 - 1,
        ),
      )
      .toBe(true);
  } finally {
    await context.close();
  }
});
