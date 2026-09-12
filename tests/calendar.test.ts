import { it, expect } from "vitest";
import { calendarDays } from "../src/core/airing";
it("builds complete Monday-based weeks across month and year boundaries", () => {
  const days = calendarDays(new Date(2026, 0, 1), "week");
  expect(days).toHaveLength(7);
  expect(days[0].getFullYear()).toBe(2025);
  expect(days[0].getDate()).toBe(29);
  expect(days[6].getDate()).toBe(4);
});
it("includes all month dates including a six-week month", () => {
  const days = calendarDays(new Date(2026, 2, 15), "month");
  expect(days).toHaveLength(42);
  expect(days.filter((d) => d.getMonth() === 2)).toHaveLength(31);
  expect(days[0].getDay()).toBe(1);
  expect(days.at(-1)?.getDay()).toBe(0);
});
