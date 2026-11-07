import { describe, it, expect } from "vitest";
import { bucketIndexFor, buildBuckets, finerZoom, shiftAnchor, windowFor } from "./timeline";
import type { FabricEvent } from "./events";

const ev = (id: string, at: Date, module = "payroll") => ({ id, created_at: at.toISOString(), module, name: `${module}.x` }) as unknown as FabricEvent;
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min);

describe("event timeline", () => {
  it("has the right number of buckets per zoom level, empty ones included", () => {
    const a = at(2026, 1, 10, 14, 20); // Feb 2026
    expect(buildBuckets("hour", a, [], null)).toHaveLength(12); // 5-minute buckets
    expect(buildBuckets("day", a, [], null)).toHaveLength(24);
    expect(buildBuckets("week", a, [], null)).toHaveLength(7);
    expect(buildBuckets("month", a, [], null)).toHaveLength(28);
    expect(buildBuckets("year", a, [], null)).toHaveLength(12);
  });
  it("weeks start on Monday", () => {
    expect(windowFor("week", at(2026, 10, 7)).start.getDay()).toBe(1);
  });
  it("counts events per category and filters overlays", () => {
    const a = at(2026, 0, 1);
    const events = [ev("1", at(2026, 0, 1, 3), "payroll"), ev("2", at(2026, 0, 1, 3, 30), "worker"), ev("3", at(2026, 0, 2, 1))];
    const all = buildBuckets("day", a, events, null);
    expect(all[3].total).toBe(2);
    expect(all.reduce((n, b) => n + b.total, 0)).toBe(2); // event 3 is outside the day
    const finance = buildBuckets("day", a, events, ["finance"]);
    expect(finance[3].total).toBe(1);
  });
  it("pans by whole windows and drills one level finer", () => {
    expect(shiftAnchor("month", at(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(finerZoom("year")).toBe("month");
    expect(finerZoom("hour")).toBeNull();
  });
  it("locates the bucket for a jumped-to event", () => {
    const b = buildBuckets("day", at(2026, 0, 1), [], null);
    expect(bucketIndexFor(b, at(2026, 0, 1, 17, 45))).toBe(17);
  });
});
