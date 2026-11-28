import { agreedRate, hourlyAmounts, type ContractTerms } from "./contract-rates.ts";
type Ticket = { id: string; work_date: string; regular_hours: number | string; overtime_hours: number | string; double_time_hours: number | string };
type Reimbursement = { exp: number; mile: number };
const round = (n: number) => Math.round(n * 100) / 100;
const cell = (v: unknown) => {
  let value = v == null ? "" : String(v);
  if (typeof v === "string" && /^[\s]*[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export function buildContractExport(kind: "payroll" | "billing", tickets: Ticket[], termsByTicket: Map<string, ContractTerms>, reimbursements: Map<string, Reimbursement>) {
  if (!tickets.length) throw new Error("An export needs approved contracted tickets.");
  const rows: unknown[][] = [kind === "payroll"
    ? ["work_date", "worker_code", "worker_name", "client", "ticket_id", "regular_hours", "overtime_hours", "double_time_hours", "pay_rate", "regular_pay", "overtime_pay", "double_time_pay", "expenses", "mileage", "total_pay", "currency", "contract_id", "assignment_id", "contract_reference"]
    : ["work_date", "client", "worker_name", "ticket_id", "regular_hours", "overtime_hours", "double_time_hours", "bill_rate", "regular_amount", "overtime_amount", "double_time_amount", "expenses", "mileage", "total_amount", "currency", "contract_id", "assignment_id", "contract_reference"]];
  let reg = 0, ot = 0, dt = 0, gross = 0, reimbursement = 0;
  const currencies = new Set<string>();
  for (const ticket of tickets) {
    const terms = termsByTicket.get(ticket.id);
    const rate = agreedRate(terms, kind);
    if (!terms) throw new Error("Contract terms missing");
    currencies.add(rate.currency);
    const h = [Number(ticket.regular_hours), Number(ticket.overtime_hours), Number(ticket.double_time_hours)];
    if (h.some(n => !Number.isFinite(n) || n < 0)) throw new Error("Ticket hours must be non-negative finite values.");
    const amounts = hourlyAmounts(h[0], h[1], h[2], rate.amount);
    const rb = reimbursements.get(ticket.id) ?? { exp: 0, mile: 0 };
    const total = round(amounts.reduce((a, b) => a + b, 0) + rb.exp + rb.mile);
    reg += h[0]; ot += h[1]; dt += h[2]; gross += amounts.reduce((a, b) => a + b, 0); reimbursement += rb.exp + rb.mile;
    rows.push(kind === "payroll"
      ? [ticket.work_date, terms.worker_code, terms.worker_name, terms.client_name, ticket.id, ...h, rate.amount, ...amounts, round(rb.exp), round(rb.mile), total, rate.currency, terms.contract_id, terms.assignment_id, terms.contract_reference]
      : [ticket.work_date, terms.client_name, terms.worker_name, ticket.id, ...h, rate.amount, ...amounts, round(rb.exp), round(rb.mile), total, rate.currency, terms.contract_id, terms.assignment_id, terms.contract_reference]);
  }
  if (currencies.size !== 1) throw new Error(`This batch mixes currencies (${[...currencies].join(", ")}). Export each currency separately.`);
  const currency = [...currencies][0];
  rows.push([]);
  rows.push(kind === "payroll"
    ? ["TOTAL", "", "", "", "", round(reg), round(ot), round(dt), "", "", "", "", round(reimbursement), "", round(gross + reimbursement), currency, "", "", ""]
    : ["TOTAL", "", "", "", round(reg), round(ot), round(dt), "", "", "", "", round(reimbursement), "", round(gross + reimbursement), currency, "", "", ""]);
  return { csv: rows.map(r => r.map(cell).join(",")).join("\n") + "\n", rows, totals: {
    ticket_count: tickets.length, regular_hours: round(reg), overtime_hours: round(ot), double_time_hours: round(dt),
    [kind === "payroll" ? "gross_pay" : "amount"]: round(gross), reimbursements: round(reimbursement), grand_total: round(gross + reimbursement), currency, missing_rates: [], rate_source: "contract_snapshot",
  } };
}