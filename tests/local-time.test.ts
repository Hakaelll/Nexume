import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function day(zone: string, timestamp: string) {
  const module = pathToFileURL(resolve("src/core/localTime.ts")).href;
  const script = `import { localDayRange, localTimeZone, localTime } from ${JSON.stringify(module)};
    const now = Date.parse(${JSON.stringify(timestamp)});
    console.log(JSON.stringify({ zone: localTimeZone(), time: localTime(now), bounds: localDayRange(now).map(d => d.toISOString()) }));`;
  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: zone, LANG: "en_US.UTF-8" },
      encoding: "utf8",
    }),
  );
}

it("uses the device's date and timezone instead of Spain's", () => {
  const result = day("America/Los_Angeles", "2026-07-10T23:30:00Z");
  expect(result.zone).toBe("America/Los_Angeles");
  expect(result.time).toMatch(/04:30|16:30/);
  expect(result.bounds).toEqual([
    "2026-07-10T07:00:00.000Z",
    "2026-07-11T07:00:00.000Z",
  ]);
});

it("supports fractional timezone offsets and local date rollover", () => {
  expect(day("Asia/Kolkata", "2026-07-10T23:30:00Z").bounds).toEqual([
    "2026-07-10T18:30:00.000Z",
    "2026-07-11T18:30:00.000Z",
  ]);
});

it("uses 23- and 25-hour local days across daylight-saving changes", () => {
  for (const [timestamp, hours] of [
    ["2026-03-08T12:00:00Z", 23],
    ["2026-11-01T12:00:00Z", 25],
  ] as const) {
    const { bounds } = day("America/New_York", timestamp);
    expect(Date.parse(bounds[1]) - Date.parse(bounds[0])).toBe(hours * 3600000);
  }
});
