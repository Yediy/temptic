import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an effective date");
const money = z.coerce.number().finite().positive("Enter the agreed hourly amount above zero");
export const contractSchema = z.object({
  reference: z.string().trim().min(1, "Enter the contract reference").max(160),
  client_id: z.string().uuid("Choose a client"),
  site_id: z.string().uuid().nullable(), supervisor_id: z.string().uuid("Choose the contract supervisor"),
  work_details: z.string().trim().min(1, "Enter the contracted work details").max(10000),
  pay_rate: money, bill_rate: money.nullable(), currency: z.string().regex(/^[A-Z]{3}$/),
  starts_on: date, ends_on: date.nullable(),
}).refine(v => !v.ends_on || v.ends_on >= v.starts_on, { message: "End date must not precede start date", path: ["ends_on"] });

export function withinEffectiveDates(day: string, start: string, end: string | null) {
  return day >= start && (!end || day <= end);
}