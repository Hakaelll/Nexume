import { test, expect, type Page } from "@playwright/test";
import { emptyData, type AppData } from "../../src/domain/model";
import { setLanguage, t } from "../../src/core/i18n";
import { fixture, sample } from "./qhd-fixture";

async function seed(page: Page, data: AppData) {
  await page.addInitScript(
    (state) => localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
    data,
  );
  await page.route("https://graphql.anilist.co", (route) =>
    route.fulfill({
      json: {
        data: {
          Page: {
            ...(route.request().postDataJSON().query.includes("airingSchedules")
              ? { airingSchedules: [] }
              : { media: sample }),
            pageInfo: { hasNextPage: false },
          },
        },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page: Page, path: string) {
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((image) => {
          const bounds = image.getBoundingClientRect();
          return (
            bounds.bottom > 0 &&
            bounds.top < innerHeight &&
            bounds.right > 0 &&
            bounds.left < innerWidth
          );
        })
        .map((image) => image.decode().catch(() => {})),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await page.screenshot({ path });
}

for (const [width, height] of [
  [2560, 1440],
  [1920, 1080],
  [1440, 1000],
  [960, 640],
]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${theme} workspace alignment at ${width}x${height}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height });
      const data = fixture();
      data.preferences.theme = theme;
      await seed(page, data);
      let contentLeft = 0;
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
        await page.getByRole("button", { name, exact: true }).first().click();
        const container = page
          .locator("main .page, main .library-page")
          .first();
        await expect.soft(container).toBeVisible();
        if (name === "Discover")
          await expect
            .soft(page.locator(".discover-page .anime-card"))
            .toHaveCount(sample.length);
        const bounds = await container.boundingBox();
        expect.soft(bounds!.width).toBeLessThanOrEqual(1840);
        if (name === "Home") {
          contentLeft = bounds!.x;
          if (width === 2560) expect.soft(bounds!.width).toBe(1840);
        }
        expect
          .soft(Math.abs(bounds!.x - contentLeft), name)
          .toBeLessThanOrEqual(1);
        const search = await page.locator(".header-search").boundingBox();
        const gutter = await container.evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingRight),
        );
        expect
          .soft(
            Math.abs(
              search!.x + search!.width - (bounds!.x + bounds!.width - gutter),
            ),
          )
          .toBeLessThanOrEqual(1);
        expect
          .soft(
            await page
              .locator("main")
              .evaluate((element) => element.scrollWidth - element.clientWidth),
            name,
          )
          .toBeLessThanOrEqual(1);
        await capture(
          page,
          testInfo.outputPath(`${name.replaceAll(" ", "-")}.png`),
        );
        if (name === "Calendar") {
          await page
            .getByRole("button", { name: "Month", exact: true })
            .click();
          await capture(page, testInfo.outputPath("Calendar-month.png"));
        }
      }
      await page.getByRole("button", { name: "Library", exact: true }).click();
      for (const view of ["List", "Collection", "Grid"]) {
        await page.getByRole("button", { name: view, exact: true }).click();
        if (view === "Collection") {
          await expect.soft(page.locator("canvas")).toBeVisible();
          const stage = await page.locator(".collection-stage").boundingBox();
          expect.soft(stage!.height).toBeLessThanOrEqual(760);
          const canvas = await page.locator(".webgl-host").boundingBox();
          const heading = await page
            .locator(".collection-heading")
            .boundingBox();
          const thought = await page
            .locator(".collection-thought")
            .boundingBox();
          expect
            .soft(canvas!.y)
            .toBeGreaterThanOrEqual(heading!.y + heading!.height);
          expect
            .soft(canvas!.y + canvas!.height)
            .toBeLessThanOrEqual(thought!.y + 1);
        }
        await capture(page, testInfo.outputPath(`Library-${view}.png`));
      }
      await page
        .getByRole("button", { name: "Open Anime 0000", exact: true })
        .first()
        .click();
      await expect.soft(page.locator(".detail-hero")).toBeVisible();
      expect
        .soft((await page.locator(".detail-body").boundingBox())!.x)
        .toBeCloseTo(contentLeft, 0);
      await capture(page, testInfo.outputPath("Detail.png"));
      await page
        .getByRole("button", { name: "Write a thought", exact: true })
        .click();
      await expect.soft(page.getByRole("dialog")).toBeVisible();
      await capture(page, testInfo.outputPath("Review-dialog.png"));
    });
  }
}

test("dark controls use readable selected colors and native dark surfaces", async ({
  page,
}) => {
  const data = fixture();
  data.preferences.theme = "dark";
  await seed(page, data);
  const active = page.locator('.nav-rail button[aria-current="page"]').first();
  expect(
    await active
      .locator("svg")
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe(await active.evaluate((element) => getComputedStyle(element).color));
  const primary = page.locator(".button.primary").first();
  await expect(primary).toHaveCSS("color", "rgb(17, 17, 17)");
  await page
    .getByRole("button", { name: "Calendar", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".outside-month").first()).toHaveCSS(
    "background-color",
    "rgb(24, 24, 24)",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveCSS(
    "color-scheme",
    "dark",
  );
  await expect(page.locator('input[type="checkbox"]').first()).toHaveCSS(
    "color-scheme",
    "dark",
  );
  await page.getByLabel("Theme", { exact: true }).selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const section of ["Home", "Watchlist"] as const) {
  for (const count of [100, 500, 1000]) {
    test(`${section} bounds full cards for ${count} titles and preserves distant actions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await seed(page, fixture(count, section));
      const cards = page.locator(
        section === "Home" ? ".continue-grid" : ".watchlist-grid",
      );
      await expect(cards.locator(".anime-card")).toHaveCount(count);
      const mounted = () =>
        cards
          .locator(".card-actions button")
          .count()
          .then((number) => number / 4);
      expect(await mounted()).toBeLessThan(100);
      const title = `Anime ${String(Math.floor(count / 2)).padStart(4, "0")}`;
      const slot = cards.locator(".library-card-slot").filter({
        has: page.getByRole("button", { name: `Open ${title}`, exact: true }),
      });
      await slot.scrollIntoViewIfNeeded();
      const cover = slot.locator(".cover-button");
      await expect(slot.locator(".card-actions button")).toHaveCount(4);
      await cover.focus();
      const height = await slot.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      await page.keyboard.press("Enter");
      await expect(page.locator(".detail-info h1")).toHaveText(title);
      await page.keyboard.press("Escape");
      await expect(cover).toBeFocused();
      expect(
        Math.abs((await slot.boundingBox())!.height - height),
      ).toBeLessThanOrEqual(1);
      if (section === "Watchlist") {
        await slot.getByRole("combobox").selectOption("3");
        await expect
          .poll(() =>
            page.evaluate(
              (title) =>
                JSON.parse(
                  localStorage.getItem("nexume.preview.v1")!,
                ).entries.find(
                  (entry: { preferredTitle: string }) =>
                    entry.preferredTitle === title,
                ).priority,
              title,
            ),
          )
          .toBe(3);
      } else {
        await slot
          .getByRole("button", {
            name: `Add one episode to ${title}`,
          })
          .click();
        await expect
          .poll(() =>
            page.evaluate(
              (title) =>
                JSON.parse(
                  localStorage.getItem("nexume.preview.v1")!,
                ).entries.find(
                  (entry: { preferredTitle: string }) =>
                    entry.preferredTitle === title,
                ).watchedEpisodes,
              title,
            ),
          )
          .toBe(1);
      }
      expect(await mounted()).toBeLessThan(100);
    });
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} empty, loading and recoverable error states fit a small window`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 960, height: 640 });
    const data = emptyData();
    Object.assign(data.preferences, {
      theme,
      language: "en",
      motionMode: "reduced",
    });
    await seed(page, data);
    await expect(page.locator(".home-welcome")).toBeVisible();
    await capture(page, testInfo.outputPath("Home-empty.png"));
    await page.getByRole("button", { name: "Watchlist", exact: true }).click();
    await capture(page, testInfo.outputPath("Watchlist-empty.png"));
    await page.unroute("https://graphql.anilist.co");
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("https://graphql.anilist.co", async (route) => {
      await pending;
      await route.fulfill({
        status: 400,
        json: { errors: [{ message: "Test catalog unavailable" }] },
      });
    });
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await expect(page.locator(".skeleton-grid")).toBeVisible();
    await capture(page, testInfo.outputPath("Discover-loading.png"));
    release();
    await expect(page.getByRole("alert")).toContainText(
      "Test catalog unavailable",
    );
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();
    await capture(page, testInfo.outputPath("Discover-error.png"));
    expect(
      await page
        .locator("main")
        .evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
}

for (const width of [960, 2560]) {
  test(`Spanish labels and profile dialog fit at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 960 ? 640 : 1440 });
    const data = fixture();
    data.preferences.language = "es";
    data.preferences.theme = "dark";
    setLanguage("es");
    try {
      await seed(page, data);
      for (const name of [
        "Library",
        "Watchlist",
        "Calendar",
        "Settings",
        "Your profile",
      ]) {
        await page
          .getByRole("button", { name: t(name), exact: true })
          .first()
          .click();
        expect(
          await page
            .locator("main")
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(1);
        await capture(
          page,
          testInfo.outputPath(`${name.replaceAll(" ", "-")}-es.png`),
        );
      }
      await page
        .getByRole("button", { name: t("Edit profile"), exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await capture(page, testInfo.outputPath("Profile-dialog-es.png"));
    } finally {
      setLanguage("en");
    }
  });
}
