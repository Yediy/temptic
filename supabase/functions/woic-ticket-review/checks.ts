// Deterministic ticket checks — run before WOIC so the model reasons over facts, not guesses.
export type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };

type Day = { day_date?: string | null; start_time?: string | null; end_time?: string | null; lunch_start?: string | null; lunch_end?: string | null; total_hours?: number | string | null };
type Ticket = { ticket_type?: string; status?: string; total_hours?: number | string | null; start_time?: string | null; work_date?: string | null; week_start_date?: string | null; week_end_date?: string | null; ticket_days?: Day[] };

const n = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));
const mins = (t?: string | null) => { if (!t) return NaN; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

export function runTicketChecks(t: Ticket): Check[] {
  const days = (t.ticket_days ?? []).filter((d) => n(d.total_hours) > 0 || d.start_time);
  const checks: Check[] = [];
  const total = n(t.total_hours);
  const daySum = days.reduce((s, d) => s + (n(d.total_hours) || 0), 0);

  checks.push(isNaN(total) || total <= 0
    ? { id: "total_hours", label: "Total hours recorded", status: "fail", detail: "No total hours on the ticket." }
    : { id: "total_hours", label: "Total hours recorded", status: "pass", detail: `${total} h` });

  if (days.length && !isNaN(total)) {
    const diff = Math.abs(daySum - total);
    checks.push(diff > 0.25
      ? { id: "sum_matches", label: "Daily hours add up", status: "fail", detail: `Days add up to ${daySum.toFixed(2)} h but total says ${total} h.` }
      : { id: "sum_matches", label: "Daily hours add up", status: "pass", detail: `${daySum.toFixed(2)} h across ${days.length} day(s)` });
  }

  const long = days.filter((d) => n(d.total_hours) > 16);
  checks.push(long.length
    ? { id: "day_length", label: "No implausibly long days", status: "fail", detail: `${long.length} day(s) over 16 h (${long.map((d) => d.day_date).join(", ")}).` }
    : days.some((d) => n(d.total_hours) > 12)
      ? { id: "day_length", label: "No implausibly long days", status: "warn", detail: "At least one day is over 12 h." }
      : { id: "day_length", label: "No implausibly long days", status: "pass", detail: "All days ≤ 12 h." });

  const badTimes = days.filter((d) => {
    const s = mins(d.start_time), e = mins(d.end_time);
    if (isNaN(s) || isNaN(e)) return false;
    let span = (e - s + 1440) % 1440;
    const ls = mins(d.lunch_start), le = mins(d.lunch_end);
    if (!isNaN(ls) && !isNaN(le)) span -= Math.max(0, le - ls);
    return Math.abs(span / 60 - (n(d.total_hours) || 0)) > 0.5;
  });
  if (days.some((d) => d.start_time && d.end_time)) {
    checks.push(badTimes.length
      ? { id: "times_match", label: "Clock times match hours", status: "warn", detail: `${badTimes.length} day(s) where start/end/lunch don't match the hours claimed.` }
      : { id: "times_match", label: "Clock times match hours", status: "pass", detail: "Start, end and lunch times match." });
  }

  if (t.ticket_type === "weekly") {
    checks.push(total > 60
      ? { id: "weekly_cap", label: "Weekly hours reasonable", status: "warn", detail: `${total} h in one week (over 60).` }
      : { id: "weekly_cap", label: "Weekly hours reasonable", status: "pass", detail: `${isNaN(total) ? 0 : total} h this week` });
    const out = days.filter((d) => d.day_date && t.week_start_date && t.week_end_date && (d.day_date < t.week_start_date || d.day_date > t.week_end_date));
    if (out.length) checks.push({ id: "in_week", label: "Days inside the ticket week", status: "fail", detail: `${out.length} day(s) fall outside the week.` });
  }

  const future = days.filter((d) => d.day_date && d.day_date > new Date().toISOString().slice(0, 10));
  if (future.length || (t.work_date && t.work_date > new Date().toISOString().slice(0, 10))) {
    checks.push({ id: "future", label: "No future-dated work", status: "fail", detail: "Hours are recorded for a date that hasn't happened yet." });
  }
  return checks;
}

/** Hard guardrail on top of WOIC: a failed check can never yield a "sign" recommendation. */
export function guardRecommendation(rec: string, checks: Check[]): "sign" | "reject" | "review" {
  const r = rec === "sign" || rec === "reject" ? rec : "review";
  if (r === "sign" && checks.some((c) => c.status === "fail")) return "review";
  return r;
}
