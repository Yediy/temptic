// Operational context assembly for the WOIC Cognitive Core.
// Produces a compact, tenant-scoped snapshot of the organization that every
// reasoning / prediction / executive call grounds itself in.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function count(db: SupabaseClient, table: string, agencyId: string, filters: Record<string, unknown> = {}) {
  try {
    let q = db.from(table).select("id", { count: "exact", head: true }).eq("agency_id", agencyId);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { count: c } = await q;
    return c ?? 0;
  } catch {
    return 0;
  }
}

async function safeRows(
  db: SupabaseClient,
  table: string,
  agencyId: string,
  columns: string,
  limit = 20,
  orderBy = "created_at",
) {
  try {
    const { data } = await db
      .from(table)
      .select(columns)
      .eq("agency_id", agencyId)
      .order(orderBy, { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

export interface OrgSnapshot {
  generated_at: string;
  workforce: Record<string, number>;
  tickets: Record<string, number>;
  jobs: Record<string, number>;
  compliance: Record<string, number>;
  finance: Record<string, number>;
  recent_events: unknown[];
  open_risks: unknown[];
}

export async function buildOrgSnapshot(db: SupabaseClient, agencyId: string): Promise<OrgSnapshot> {
  const [
    workersTotal, workersActive,
    ticketsDraft, ticketsSent, ticketsSigned, ticketsRejected,
    jobsOpen, jobsFilled,
    complianceOpen,
    invoicesOpen, payrollRuns,
    recentEvents, openRisks,
  ] = await Promise.all([
    count(db, "workers", agencyId),
    count(db, "workers", agencyId, { status: "active" }),
    count(db, "tickets", agencyId, { status: "draft" }),
    count(db, "tickets", agencyId, { status: "sent" }),
    count(db, "tickets", agencyId, { status: "signed" }),
    count(db, "tickets", agencyId, { status: "rejected" }),
    count(db, "jobs", agencyId, { status: "open" }),
    count(db, "jobs", agencyId, { status: "filled" }),
    count(db, "woic_compliance_events", agencyId, { status: "open" }),
    count(db, "pb_invoices", agencyId, { status: "sent" }),
    count(db, "pb_payroll_runs", agencyId),
    safeRows(db, "ttos_events", agencyId, "id, event_type, entity_type, entity_id, created_at", 25),
    safeRows(db, "woic_security_signals", agencyId, "id, kind, severity, title, status, detected_at", 10, "detected_at"),
  ]);

  return {
    generated_at: new Date().toISOString(),
    workforce: { total: workersTotal, active: workersActive },
    tickets: { draft: ticketsDraft, sent: ticketsSent, signed: ticketsSigned, rejected: ticketsRejected },
    jobs: { open: jobsOpen, filled: jobsFilled },
    compliance: { open_events: complianceOpen },
    finance: { invoices_sent: invoicesOpen, payroll_runs: payrollRuns },
    recent_events: recentEvents,
    open_risks: openRisks,
  };
}

/** Organizational preferences learned from feedback + org memory. */
export async function loadOrgPreferences(db: SupabaseClient, agencyId: string) {
  const [{ data: mem }, { data: fb }] = await Promise.all([
    db.from("woic_org_memory").select("kind, key, value, weight").eq("agency_id", agencyId).limit(50),
    db.from("woic_feedback").select("target_kind, signal, correction, weight").eq("agency_id", agencyId)
      .order("created_at", { ascending: false }).limit(50),
  ]);
  return { org_memory: mem ?? [], recent_feedback: fb ?? [] };
}
