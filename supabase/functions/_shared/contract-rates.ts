export type ContractTerms = {
  contract_id: string; assignment_id: string; contract_reference: string;
  pay_rate: number | string; bill_rate: number | string | null; currency: string;
  worker_name: string; worker_code: string | null; client_name: string;
};

export function agreedRate(terms: ContractTerms | undefined, kind: "payroll" | "billing") {
  if (!terms?.contract_id || !terms.assignment_id) throw new Error("A contracted assignment and captured agreed terms are required for every ticket.");
  const value = kind === "payroll" ? terms.pay_rate : terms.bill_rate;
  const amount = Number(value);
  if (value == null || !Number.isFinite(amount) || amount <= 0) throw new Error(`The contract needs a positive agreed ${kind === "payroll" ? "pay" : "bill"} rate.`);
  if (!/^[A-Z]{3}$/.test(terms.currency)) throw new Error("Contract currency is required.");
  return { amount, currency: terms.currency };
}

export function hourlyAmounts(regular: number, overtime: number, doubleTime: number, rate: number) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(regular * rate), round(overtime * rate * 1.5), round(doubleTime * rate * 2)];
}