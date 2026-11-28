import { agreedRate, hourlyAmounts, type ContractTerms } from "./contract-rates.ts";
import { buildContractExport, serializeCsv } from "./contract-export.ts";

export type PayrollTicket = { id: string; worker_id: string; work_date: string; regular_hours: number | string; overtime_hours: number | string; double_time_hours: number | string };
export type Deduction = { worker_id: string; label: string; amount: number };
export type PayPeriod = { period_start: string; period_end: string; pay_date?: string | null };
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const date = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error("Choose valid payroll dates.");
  return d;
};
export function validatePeriod(period: PayPeriod) {
  date(period.period_start); date(period.period_end);
  if (period.period_end < period.period_start) throw new Error("Pay period end must follow its start.");
  if (period.pay_date) { date(period.pay_date); if (period.pay_date < period.period_end) throw new Error("Pay date must not precede period end."); }
}
export function weekBounds(start: string, end: string) {
  const a = date(start), b = date(end);
  a.setUTCDate(a.getUTCDate() - (a.getUTCDay() + 6) % 7);
  b.setUTCDate(b.getUTCDate() + 6 - (b.getUTCDay() + 6) % 7);
  return { start: a.toISOString().slice(0, 10), end: b.toISOString().slice(0, 10) };
}
// Existing approved daily premiums remain premiums; only unpaid regular hours
// exceeding the weekly regular-hours cap are upgraded, never paid twice.
export function weeklyPayrollHours(context: PayrollTicket[]) {
  const regularByWeek = new Map<string, number>();
  return [...context].sort((a, b) => a.work_date.localeCompare(b.work_date) || a.id.localeCompare(b.id)).map(t => {
    const hours = [Number(t.regular_hours), Number(t.overtime_hours), Number(t.double_time_hours)];
    if (hours.some(h => !Number.isFinite(h) || h < 0)) throw new Error("Approved hours must be finite and non-negative.");
    const key = `${t.worker_id}:${weekBounds(t.work_date, t.work_date).start}`;
    const used = regularByWeek.get(key) ?? 0;
    const regular = Math.min(hours[0], Math.max(0, 40 - used));
    regularByWeek.set(key, used + hours[0]);
    return { ...t, regular_hours: money(regular), overtime_hours: money(hours[1] + hours[0] - regular), double_time_hours: hours[2] };
  });
}

export function calculatePayroll(period: PayPeriod, selected: PayrollTicket[], weekContext: PayrollTicket[], terms: Map<string, ContractTerms>, reimbursements: Map<string, { exp: number; mile: number }>, deductions: Deduction[] = []) {
  validatePeriod(period);
  if (selected.some(t => t.work_date < period.period_start || t.work_date > period.period_end)) throw new Error("Ticket falls outside the selected pay period.");
  const ids = new Set(selected.map(t => t.id));
  const tickets = weeklyPayrollHours(weekContext).filter(t => ids.has(t.id));
  if (tickets.length !== ids.size || !tickets.length) throw new Error("No approved contracted work in this pay period.");
  const workers = new Map<string, { worker_id: string; worker_name: string; worker_code: string | null; currency: string; regular_hours: number; overtime_hours: number; double_time_hours: number; regular_pay: number; overtime_pay: number; double_time_pay: number; gross_pay: number; reimbursements: number; deductions: number; net_pay: number; total_pay: number; rates: number[] }>();
  const ticketGross = new Map<string, number>();
  for (const t of tickets) {
    const term = terms.get(t.id); const rate = agreedRate(term, "payroll");
    if (!term) throw new Error("Contract terms missing.");
    const pay = hourlyAmounts(Number(t.regular_hours), Number(t.overtime_hours), Number(t.double_time_hours), rate.amount);
    const gross = money(pay.reduce((a, b) => a + b, 0)); ticketGross.set(t.id, gross);
    const rb = reimbursements.get(t.id) ?? { exp: 0, mile: 0 };
    if (![rb.exp, rb.mile].every(n => Number.isFinite(n) && n >= 0)) throw new Error("Invalid approved reimbursement.");
    const w = workers.get(t.worker_id) ?? { worker_id: t.worker_id, worker_name: term.worker_name, worker_code: term.worker_code, currency: rate.currency, regular_hours: 0, overtime_hours: 0, double_time_hours: 0, regular_pay: 0, overtime_pay: 0, double_time_pay: 0, gross_pay: 0, reimbursements: 0, deductions: 0, net_pay: 0, total_pay: 0, rates: [] };
    if (w.currency !== rate.currency) throw new Error("One worker's payroll cannot mix currencies.");
    w.regular_hours += Number(t.regular_hours); w.overtime_hours += Number(t.overtime_hours); w.double_time_hours += Number(t.double_time_hours);
    w.regular_pay = money(w.regular_pay + pay[0]); w.overtime_pay = money(w.overtime_pay + pay[1]); w.double_time_pay = money(w.double_time_pay + pay[2]);
    w.gross_pay = money(w.gross_pay + gross); w.reimbursements = money(w.reimbursements + rb.exp + rb.mile);
    if (!w.rates.includes(rate.amount)) w.rates.push(rate.amount);
    workers.set(t.worker_id, w);
  }
  for (const deduction of deductions) {
    const w = workers.get(deduction.worker_id);
    if (!w || !deduction.label.trim() || deduction.label.length > 120 || !Number.isFinite(deduction.amount) || deduction.amount < 0 || Math.abs(money(deduction.amount) - deduction.amount) > 0.000001) throw new Error("Deductions need a payroll worker, description and non-negative amount with at most two decimals.");
    w.deductions = money(w.deductions + deduction.amount);
  }
  for (const w of workers.values()) {
    if (w.deductions > w.gross_pay) throw new Error(`Deductions exceed gross pay for ${w.worker_name}.`);
    w.net_pay = money(w.gross_pay - w.deductions); w.total_pay = money(w.net_pay + w.reimbursements);
  }
  const remaining = new Map([...workers].map(([id, w]) => [id, w.deductions]));
  const byTicket = new Map<string, number>();
  for (const t of tickets) {
    const amount = Math.min(remaining.get(t.worker_id) ?? 0, ticketGross.get(t.id) ?? 0);
    byTicket.set(t.id, amount); remaining.set(t.worker_id, money((remaining.get(t.worker_id) ?? 0) - amount));
  }
  const output = buildContractExport("payroll", tickets, terms, reimbursements, byTicket);
  output.rows[0].push("period_start", "period_end", "pay_date", "deduction_details");
  tickets.forEach((t, i) => output.rows[i + 1].push(period.period_start, period.period_end, period.pay_date ?? "", deductions.filter(d => d.worker_id === t.worker_id).map(d => `${d.label}: ${d.amount.toFixed(2)}`).join("; ")));
  output.rows[output.rows.length - 1].push(period.period_start, period.period_end, period.pay_date ?? "", "");
  return { workers: [...workers.values()], tickets, totals: output.totals, csv: serializeCsv(output.rows) };
}
export type PayrollReview = ReturnType<typeof calculatePayroll>;
export function payrollSignature(value: unknown): string {
  const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalize(x)])):v;
  return JSON.stringify(normalize(value));
}