import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { emptyData, createEntry, type AppData } from "../../src/domain/model";
import { mapAnime, type AniListDTO } from "../../src/services/anilist/provider";
const sample = JSON.parse(
  readFileSync("public/demo/anime.json", "utf8"),
) as AniListDTO[];
const evidence: unknown[] = [];
for (const count of [10, 100, 500, 1000])
  test(`bounded Collection resources for ${count} titles`, async ({ page }) => {
    const data = emptyData();
    data.entries = Array.from({ length: count }, (_, i) => {
      const dto = sample[i % sample.length];
      const m = mapAnime({ ...dto, id: 100000 + i });
      return {
        ...createEntry(m),
        coverImage: i % 17 === 0 ? "" : `/demo/${dto.id}-cover.jpg`,
      };
    });
    data.preferences = {
      ...data.preferences,
      section: "Library",
      view: "Collection",
      selectedId: data.entries[Math.floor(count / 2)].localId,
      sort: "title",
      quality: "High",
      diagnostics: true,
    };
    await page.addInitScript(
      (state: AppData) =>
        localStorage.setItem("nexume.preview.v1", JSON.stringify(state)),
      data,
    );
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.locator(".graphics-metrics")).toContainText("cases");
    await expect(page.locator(".graphics-metrics")).toContainText(
      /\b[1-9]\d* cases/,
    );
    const canvas = page.locator("canvas");
    // Texture callbacks may wake the renderer; it must stop once they settle.
    await page.waitForTimeout(3000);
    const beforeIdle = await canvas.getAttribute("data-rendered-frames");
    await page.waitForTimeout(700);
    expect(await canvas.getAttribute("data-rendered-frames")).toBe(beforeIdle);
    const device = await canvas.evaluate((c) => {
      const gl = (c as HTMLCanvasElement).getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext
        ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : "Unavailable";
    });
    await page.locator(".collection-stage").focus();
    for (let i = 0; i < 8; i++)
      await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
    const metrics = await page.locator(".graphics-metrics").innerText();
    const active = Number(metrics.match(/(\d+) cases/)?.[1]);
    expect(active).toBeLessThanOrEqual(21);
    expect(Number(metrics.match(/(\d+) textures/)?.[1])).toBeLessThanOrEqual(
      75,
    );
    const frameTimes = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const frames: number[] = [];
          let previous = performance.now();
          const frame = (now: number) => {
            frames.push(now - previous);
            previous = now;
            if (frames.length >= 60) resolve(frames.slice(5));
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
    const sorted = [...frameTimes].sort((a, b) => a - b);
    evidence.push({
      count,
      device,
      metrics,
      meanFrameMs: frameTimes.reduce((s, n) => s + n, 0) / frameTimes.length,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
    });
    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      "test-results/performance.json",
      JSON.stringify(evidence, null, 2),
    );
    if (count === 1000)
      await page.screenshot({ path: "test-results/collection-1000.png" });
  });
