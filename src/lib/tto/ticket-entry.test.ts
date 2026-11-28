import { describe, it, expect } from "vitest";
import { shiftFromHours } from "./ticket-entry";
describe("time ticket hours entry", () => {
  it("turns an Eastern 8:00 start and 8 hours into a 13:00–21:00 UTC shift", () => {
    expect(shiftFromHours("2026-11-27", "08:00", 8, "America/New_York")).toEqual({ actual_start: "2026-11-27T13:00:00.000Z", actual_end: "2026-11-27T21:00:00.000Z" });
  });
  it("supports fractional hours and overnight shifts", () => {
    expect(shiftFromHours("2026-11-27", "22:00", 3.5, "America/New_York").actual_end).toBe("2026-11-28T06:30:00.000Z");
  });
  it("rejects zero or more than 24 hours", () => {
    expect(() => shiftFromHours("2026-11-27", "08:00", 0, "America/New_York")).toThrow("Hours worked");
    expect(() => shiftFromHours("2026-11-27", "08:00", 25, "America/New_York")).toThrow("Hours worked");
  });
});