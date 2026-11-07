// Event Timeline windowing: zoom levels, fixed buckets (empty ones included),
// per-category overlay counts, panning, drill-down and jump-to-event positioning.
import {
  addDays, addHours, addMinutes, addMonths, addWeeks, addYears,
  startOfDay, startOfHour, startOfMonth, startOfWeek, startOfYear,
} from "date-fns";
import { categoryOf, type EventCategory, type FabricEvent } from "@/lib/activity/events";

export type Zoom = "hour" | "day" | "week" | "month" | "year";
export const ZOOM_ORDER: Zoom[] = ["year", "month", "week", "day", "hour"];

interface ZoomCfg {
  label: string;
  windowStart: (d: Date) => Date;
  windowStep: (d: Date, n: number) => Date;
  bucketStep: (d: Date, n: number) => Date;
  bucketFmt: string;
  titleFmt: string;
}

export const ZOOMS: Record<Zoom, ZoomCfg> = {
  hour: { label: "Hour", windowStart: startOfHour, windowStep: addHours, bucketStep: (d, n) => addMinutes(d, 5 * n), bucketFmt: "HH:mm", titleFmt: "PP · HH:00" },
  day: { label: "Day", windowStart: startOfDay, windowStep: addDays, bucketStep: addHours, bucketFmt: "HH:00", titleFmt: "EEEE, PP" },
  week: { label: "Week", windowStart: (d) => startOfWeek(d, { weekStartsOn: 1 }), windowStep: addWeeks, bucketStep: addDays, bucketFmt: "EEE d", titleFmt: "'Week of' PP" },
  month: { label: "Month", windowStart: startOfMonth, windowStep: addMonths, bucketStep: addDays, bucketFmt: "d", titleFmt: "MMMM yyyy" },
  year: { label: "Year", windowStart: startOfYear, windowStep: addYears, bucketStep: addMonths, bucketFmt: "MMM", titleFmt: "yyyy" },
};

/** Zoom level one step finer — used when clicking a bucket to drill in. */
export function finerZoom(z: Zoom): Zoom | null {
  const i = ZOOM_ORDER.indexOf(z);
  return i < ZOOM_ORDER.length - 1 ? ZOOM_ORDER[i + 1] : null;
}

export function windowFor(zoom: Zoom, anchor: Date): { start: Date; end: Date } {
  const start = ZOOMS[zoom].windowStart(anchor);
  return { start, end: ZOOMS[zoom].windowStep(start, 1) };
}

export function shiftAnchor(zoom: Zoom, anchor: Date, n: number): Date {
  return ZOOMS[zoom].windowStep(ZOOMS[zoom].windowStart(anchor), n);
}

export interface Bucket {
  start: Date;
  end: Date;
  total: number;
  byCategory: Record<EventCategory, number>;
  events: FabricEvent[];
}

const emptyCounts = (): Record<EventCategory, number> =>
  ({ workforce: 0, operations: 0, finance: 0, compliance: 0, intelligence: 0, system: 0 });

/** Every bucket in the window, in order, including empty ones so gaps are visible. */
export function buildBuckets(zoom: Zoom, anchor: Date, events: FabricEvent[], categories: EventCategory[] | null): Bucket[] {
  const { start, end } = windowFor(zoom, anchor);
  const step = ZOOMS[zoom].bucketStep;
  const buckets: Bucket[] = [];
  for (let s = start; s < end; s = step(s, 1)) {
    buckets.push({ start: s, end: step(s, 1), total: 0, byCategory: emptyCounts(), events: [] });
  }
  for (const e of events) {
    const t = new Date(e.created_at).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    const cat = categoryOf(e);
    if (categories && !categories.includes(cat)) continue;
    // Buckets can be uneven (months), so search rather than divide.
    const b = buckets.find((x) => t >= x.start.getTime() && t < x.end.getTime());
    if (!b) continue;
    b.total++;
    b.byCategory[cat]++;
    b.events.push(e);
  }
  return buckets;
}

export function bucketIndexFor(buckets: Bucket[], when: Date): number {
  const t = when.getTime();
  return buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
}
