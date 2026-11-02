import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const brand = join(root, "public", "brand");
const output = join(root, ".tools", "brand", "generated-icons");
const logoOutput = join(output, "logo");
await mkdir(logoOutput, { recursive: true });

const source = await readFile(join(brand, "logo.svg"), "utf8");
assert.match(source, /viewBox="0 0 96 96"/);
const symbol = source
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .trim();
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="32" y="32" width="960" height="960" rx="208" fill="#111111"/>
  <g transform="translate(64 64) scale(9.3333333333)">
    ${symbol}
  </g>
</svg>
`;
const stagedIcon = join(output, "app-icon.svg");
await writeFile(stagedIcon, appIcon);
const cli = join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
function generate(input, directory, sizes = []) {
  execFileSync(
    process.execPath,
    [
      cli,
      "icon",
      input,
      "--output",
      directory,
      ...sizes.flatMap((size) => ["--png", String(size)]),
    ],
    { cwd: root, stdio: "inherit" },
  );
}
generate(stagedIcon, output);
generate(join(brand, "logo.svg"), logoOutput, [1024]);

const sizes = {
  "32x32.png": 32,
  "64x64.png": 64,
  "128x128.png": 128,
  "128x128@2x.png": 256,
  "icon.png": 512,
  "Square30x30Logo.png": 30,
  "Square44x44Logo.png": 44,
  "Square71x71Logo.png": 71,
  "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107,
  "Square142x142Logo.png": 142,
  "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284,
  "Square310x310Logo.png": 310,
  "StoreLogo.png": 50,
};
async function checkPng(path, size) {
  const png = await readFile(path);
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
  assert.equal(png[25], 6, "Brand PNGs must preserve their alpha channel.");
}
for (const [name, size] of Object.entries(sizes)) {
  await checkPng(join(output, name), size);
}
const ico = await readFile(join(output, "icon.ico"));
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.ok(ico.readUInt16LE(4) > 1, "Windows needs multiple icon resolutions.");
await checkPng(join(logoOutput, "1024x1024.png"), 1024);

for (const name of [...Object.keys(sizes), "icon.ico"]) {
  await copyFile(join(output, name), join(root, "src-tauri", "icons", name));
}
await copyFile(stagedIcon, join(brand, "app-icon.svg"));
await copyFile(join(logoOutput, "1024x1024.png"), join(brand, "logo.png"));
console.log(
  "Generated and verified the brand PNG, SVG app icon, and 16 Windows icon assets.",
);
