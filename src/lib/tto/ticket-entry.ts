import { addMinutes, format } from "date-fns";
import { workedTimestamp } from "./contract-validation";

/** Turns an entered start time and worked hours into real UTC clock-in/out timestamps. */
export function shiftFromHours(workDate: string, startTime: string, hours: number, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !/^\d{2}:\d{2}$/.test(startTime)) throw new Error("Enter the work date and start time.");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new Error("Hours worked must be above 0 and at most 24.");
  const localStart = `${workDate}T${startTime}`;
  const localEnd = format(addMinutes(new Date(`${localStart}:00`), Math.round(hours * 60)), "yyyy-MM-dd'T'HH:mm");
  return { actual_start: workedTimestamp(localStart, timeZone), actual_end: workedTimestamp(localEnd, timeZone) };
}