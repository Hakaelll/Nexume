import { test, expect } from "@playwright/test";
import { fixture } from "./qhd-fixture";

test("a blurred progress draft preserves the immediately following increment", async ({
  page,
}) => {
  const data = fixture(1, "Library");
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Anime 0000", exact: true })
    .first()
    .click();
  await page
    .getByRole("spinbutton", { name: "Watched episodes", exact: true })
    .fill("3");
  await page.evaluate(() => {
    document.querySelector<HTMLInputElement>(".stepper input")!.blur();
    document
      .querySelector<HTMLButtonElement>(".episode-control .plus")!
      .click();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("nexume.preview.v1")!).entries[0]
            .watchedEpisodes,
      ),
    )
    .toBe(4);
});

test("a completed tracking placeholder reserves the completion action height", async ({
  page,
}) => {
  const data = fixture(100);
  data.entries[50].totalEpisodes = 12;
  data.entries[50].watchedEpisodes = 12;
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  const slot = page
    .locator(".continue-grid .library-card-slot")
    .filter({
      has: page.getByRole("button", { name: "Open Anime 0050", exact: true }),
    });
  await expect(slot.locator(".card-actions button")).toHaveCount(0);
  const before = await slot.locator(".anime-card").boundingBox();
  await slot.scrollIntoViewIfNeeded();
  await expect(
    slot.getByRole("button", { name: "Mark as completed?" }),
  ).toBeVisible();
  const after = await slot.locator(".anime-card").boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
});

test("dark episode progress has a contrasting populated fill", async ({
  page,
}) => {
  const data = fixture(1);
  data.entries[0].watchedEpisodes = 3;
  data.preferences.theme = "dark";
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  const track = page.locator(".continue-grid .progress-track").first();
  const colors = await track.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    fill: getComputedStyle(element.firstElementChild!).backgroundColor,
  }));
  const luminance = (color: string) => {
    const channels = color
      .match(/\d+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => value / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(colors.background),
    b = luminance(colors.fill);
  expect(
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
  ).toBeGreaterThanOrEqual(3);
});
