import { agreedRate, hourlyAmounts, type ContractTerms } from "./contract-rates.ts";
type Ticket = { id: string; client_id: string | null; worker_id: string | null; work_date: string; regular_hours: number | string; overtime_hours: number | string; double_time_hours: number | string };
const round = (n: number) => Math.round(n * 100) / 100;

/** Bill rate from agreed pay plus a markup percentage. */
export function billRateFromMarkup(payRate: number, markupPct: number) {
  if (!Number.isFinite(payRate) || payRate <= 0) throw new Error("Agreed pay must be above 0.");
  if (!Number.isFinite(markupPct) || markupPct < 0 || markupPct > 500) throw new Error("Markup must be between 0% and 500%.");
  return round(payRate * (1 + markupPct / 100));
}

/** Groups approved contracted tickets into one draft invoice per client and currency, using frozen terms only. */
export function buildContractInvoices(tickets: Ticket[], terms: Map<string, ContractTerms>, alreadyInvoiced: Set<string>) {
  const groups = new Map<string, { client_id: string; currency: string; subtotal: number; items: Record<string, unknown>[] }>();
  const skipped: { ticket_id: string; reason: string }[] = [];
  for (const t of tickets) {
    if (alreadyInvoiced.has(t.id)) { skipped.push({ ticket_id: t.id, reason: "already_invoiced" }); continue; }
    const term = terms.get(t.id);
    if (!t.client_id || !term) { skipped.push({ ticket_id: t.id, reason: "no_contract_terms" }); continue; }
    let bill, pay;
    try { bill = agreedRate(term, "billing"); pay = agreedRate(term, "payroll"); } catch (e) { skipped.push({ ticket_id: t.id, reason: (e as Error).message }); continue; }
    const key = `${t.client_id}|${bill.currency}`;
    const g = groups.get(key) ?? { client_id: t.client_id, currency: bill.currency, subtotal: 0, items: [] };
    const h = [Number(t.regular_hours), Number(t.overtime_hours), Number(t.double_time_hours)];
    const billed = hourlyAmounts(h[0], h[1], h[2], bill.amount); const paid = hourlyAmounts(h[0], h[1], h[2], pay.amount);
    ["Regular", "Overtime", "Double time"].forEach((label, i) => {
      if (!(h[i] > 0)) return;
      g.items.push({ ticket_id: t.id, worker_id: t.worker_id, description: `${label} hours · ${term.worker_name} · ${t.work_date} · ${term.contract_reference}`, hours: h[i], bill_rate: bill.amount * [1, 1.5, 2][i], markup: round(billed[i] - paid[i]), amount: billed[i] });
      g.subtotal = round(g.subtotal + billed[i]);
    });
    groups.set(key, g);
  }
  return { invoices: [...groups.values()].filter(g => g.items.length), skipped };
}