import { test, expect } from "@playwright/test";
test("backup export, validated restore preview and replacement", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page
    .getByRole("button", { name: "Add sample collection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Nexume backup" }).click();
  const download = await downloadPromise;
  const backup = info.outputPath("backup.json");
  await download.saveAs(backup);
  const filePromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restore a backup" }).click();
  const chooser = await filePromise;
  await chooser.setFiles(backup);
  await expect(page.getByRole("dialog")).toContainText("12 anime");
  await page.getByLabel("Restore method").selectOption("replace");
  const beforeRestore = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save backup & restore" }).click();
  await beforeRestore;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".poster-grid .anime-card")).toHaveCount(12);
});
