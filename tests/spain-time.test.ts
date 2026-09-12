import { expect, it } from "vitest";
import { spainDayRange, spainTime } from "../src/core/spainTime";

it("formats Spain's winter and summer hours independently of the device zone", () => {
  expect(spainTime(Date.parse("2026-01-10T12:00:00Z"))).toBe("13:00");
  expect(spainTime(Date.parse("2026-07-10T12:00:00Z"))).toBe("14:00");
});

it("selects the Spanish day when UTC is still on the previous date", () => {
  expect(
    spainDayRange(Date.parse("2026-07-10T23:30:00Z")).map((d) =>
      d.toISOString(),
    ),
  ).toEqual(["2026-07-10T22:00:00.000Z", "2026-07-11T22:00:00.000Z"]);
});

it("uses actual midnight boundaries on both daylight-saving changes", () => {
  const spring = spainDayRange(Date.parse("2026-03-29T12:00:00Z"));
  const autumn = spainDayRange(Date.parse("2026-10-25T12:00:00Z"));
  expect(spring.map((d) => d.toISOString())).toEqual([
    "2026-03-28T23:00:00.000Z",
    "2026-03-29T22:00:00.000Z",
  ]);
  expect(autumn.map((d) => d.toISOString())).toEqual([
    "2026-10-24T22:00:00.000Z",
    "2026-10-25T23:00:00.000Z",
  ]);
});
