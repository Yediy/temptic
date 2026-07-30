// Operational Intelligence Center (IWOS 4.9) hooks.
// Pure aggregation layer: reads existing module tables + WOIC. No new storage.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type HealthKey =
  | "organization"
  | "recruiting"
  | "availability"
  | "coverage"
  | "payroll"
  | "compliance"
  | "training"
  | "client"
  | "revenue"
  | "risk"
  | "ai"
  | "capacity";

export interface HealthScore {
  key: HealthKey;
  label: string;
  score: number; // 0-100
  detail: string;
}

export interface RiskItem {
  key: string;
  label: string;
  level: number; // 0-100, higher = riskier
  detail: string;
}

export interface OicSnapshot {
  workers: { total: number; active: number };
  tickets: { total: number; open: number; signed: number; rejected: number };
  timeTickets: { total: number; pending: number; approved: number; hours: number };
  jobs: { total: number; open: number; needed: number; filled: number };
  pipeline: { entries: number };
  training: { total: number; completed: number; expired: number };
  compliance: { events: number; open: number };
  payroll: { runs: number; approved: number; gross: number };
  invoices: { total: number; revenue: number; outstanding: number; overdue: number };
  automations: { runs: number; failures: number };
  recommendations: Array<{ id: string; kind: string; why: string | null; score: number | null; created_at: string }>;
  predictions: { count: number; avgConfidence: number };
}

const EMPTY: OicSnapshot = {
  workers: { total: 0, active: 0 },
  tickets: { total: 0, open: 0, signed: 0, rejected: 0 },
  timeTickets: { total: 0, pending: 0, approved: 0, hours: 0 },
  jobs: { total: 0, open: 0, needed: 0, filled: 0 },
  pipeline: { entries: 0 },
  training: { total: 0, completed: 0, expired: 0 },
  compliance: { events: 0, open: 0 },
  payroll: { runs: 0, approved: 0, gross: 0 },
  invoices: { total: 0, revenue: 0, outstanding: 0, overdue: 0 },
  automations: { runs: 0, failures: 0 },
  recommendations: [],
  predictions: { count: 0, avgConfidence: 0 },
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function useOicSnapshot() {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ["oic", "snapshot", agencyId],
    enabled: !!agencyId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<OicSnapshot> => {
      const a = agencyId!;
      const sel = (table: string, cols: string) =>
        sb.from(table).select(cols).eq("agency_id", a).limit(1000);

      const [
        workers,
        tickets,
        timeTickets,
        jobs,
        pipeline,
        training,
        compliance,
        payroll,
        invoices,
        autoRuns,
        recs,
        preds,
      ] = await Promise.all([
        sel("workers", "id,is_active"),
        sel("tickets", "id,status"),
        sel("tto_time_tickets", "id,status,regular_hours,overtime_hours"),
        sel("job_orders", "id,status,positions_needed,positions_filled"),
        sel("recruit_pipeline_entries", "id"),
        sel("training_enrollments", "id,status,expires_at"),
        sel("woic_compliance_events", "id,status"),
        sel("pb_payroll_runs", "id,status,totals"),
        sel("pb_invoices", "id,status,total,due_at"),
        sel("ttos_automation_runs", "id,status"),
        sb
          .from("woic_recommendations")
          .select("id,kind,why,score,created_at")
          .eq("agency_id", a)
          .order("created_at", { ascending: false })
          .limit(10),
        sel("woic_prediction_results", "id,confidence"),
      ]);

      const rows = <T,>(r: { data?: T[] | null }): T[] => (r?.data as T[]) ?? [];

      const w = rows<{ is_active: boolean }>(workers);
      const tk = rows<{ status: string }>(tickets);
      const tt = rows<{ status: string; regular_hours: number; overtime_hours: number }>(timeTickets);
      const jo = rows<{ status: string; positions_needed: number; positions_filled: number }>(jobs);
      const tr = rows<{ status: string; expires_at: string | null }>(training);
      const ce = rows<{ status: string }>(compliance);
      const pr = rows<{ status: string; totals: Record<string, unknown> | null }>(payroll);
      const inv = rows<{ status: string; total: number; due_at: string | null }>(invoices);
      const ar = rows<{ status: string }>(autoRuns);
      const pd = rows<{ confidence: number }>(preds);
      const now = Date.now();

      return {
        workers: { total: w.length, active: w.filter((x) => x.is_active).length },
        tickets: {
          total: tk.length,
          open: tk.filter((x) => ["draft", "sent", "viewed"].includes(x.status)).length,
          signed: tk.filter((x) => x.status === "signed" || x.status === "closed").length,
          rejected: tk.filter((x) => x.status === "rejected").length,
        },
        timeTickets: {
          total: tt.length,
          pending: tt.filter((x) => ["open", "in_progress", "submitted"].includes(x.status)).length,
          approved: tt.filter((x) => ["approved", "payroll_ready", "billing_ready", "closed"].includes(x.status)).length,
          hours: tt.reduce((s, x) => s + num(x.regular_hours) + num(x.overtime_hours), 0),
        },
        jobs: {
          total: jo.length,
          open: jo.filter((x) => x.status === "open").length,
          needed: jo.reduce((s, x) => s + num(x.positions_needed), 0),
          filled: jo.reduce((s, x) => s + num(x.positions_filled), 0),
        },
        pipeline: { entries: rows(pipeline).length },
        training: {
          total: tr.length,
          completed: tr.filter((x) => x.status === "completed").length,
          expired: tr.filter((x) => x.status === "expired" || (x.expires_at && new Date(x.expires_at).getTime() < now)).length,
        },
        compliance: { events: ce.length, open: ce.filter((x) => x.status !== "resolved" && x.status !== "closed").length },
        payroll: {
          runs: pr.length,
          approved: pr.filter((x) => x.status === "approved" || x.status === "paid").length,
          gross: pr.reduce((s, x) => s + num((x.totals as Record<string, unknown>)?.gross_pay), 0),
        },
        invoices: {
          total: inv.length,
          revenue: inv.reduce((s, x) => s + num(x.total), 0),
          outstanding: inv.filter((x) => x.status !== "paid" && x.status !== "void").reduce((s, x) => s + num(x.total), 0),
          overdue: inv.filter(
            (x) => x.status !== "paid" && x.status !== "void" && x.due_at && new Date(x.due_at).getTime() < now,
          ).length,
        },
        automations: { runs: ar.length, failures: ar.filter((x) => x.status === "failed").length },
        recommendations: (recs?.data ?? []) as OicSnapshot["recommendations"],
        predictions: {
          count: pd.length,
          avgConfidence: pd.length ? Math.round((pd.reduce((s, x) => s + num(x.confidence), 0) / pd.length) * 100) : 0,
        },
      };
    },
    initialData: EMPTY,
  });
}

export function useOrganizationHealth(snap: OicSnapshot): HealthScore[] {
  return useMemo(() => {
    const recruiting = clamp(snap.jobs.needed ? pct(snap.jobs.filled, snap.jobs.needed) : snap.pipeline.entries ? 70 : 50);
    const availability = clamp(snap.workers.total ? pct(snap.workers.active, snap.workers.total) : 50);
    const coverage = clamp(snap.tickets.total ? pct(snap.tickets.signed, snap.tickets.total) : 50);
    const payroll = clamp(snap.payroll.runs ? pct(snap.payroll.approved, snap.payroll.runs) : 60);
    const compliance = clamp(snap.compliance.events ? 100 - pct(snap.compliance.open, snap.compliance.events) : 90);
    const training = clamp(snap.training.total ? pct(snap.training.completed, snap.training.total) : 60);
    const client = clamp(snap.tickets.total ? 100 - pct(snap.tickets.rejected, snap.tickets.total) : 80);
    const revenue = clamp(snap.invoices.revenue ? 100 - pct(snap.invoices.outstanding, snap.invoices.revenue) : 50);
    const ai = clamp(snap.predictions.avgConfidence || 60);
    const capacity = clamp(snap.workers.active ? Math.min(100, (snap.timeTickets.hours / (snap.workers.active * 40)) * 100) : 0);
    const risk = clamp(
      100 -
        ((snap.compliance.open > 0 ? 25 : 0) +
          (snap.invoices.overdue > 0 ? 20 : 0) +
          (snap.automations.failures > 0 ? 15 : 0) +
          (snap.tickets.rejected > 0 ? 10 : 0)),
    );
    const organization = clamp(
      (recruiting + availability + coverage + payroll + compliance + training + client + revenue + risk + ai) / 10,
    );

    return [
      { key: "organization", label: "Organization Health", score: organization, detail: "Composite of all signals" },
      { key: "recruiting", label: "Recruiting Health", score: recruiting, detail: `${snap.jobs.filled}/${snap.jobs.needed} positions filled` },
      { key: "availability", label: "Worker Availability", score: availability, detail: `${snap.workers.active} of ${snap.workers.total} active` },
      { key: "coverage", label: "Assignment Coverage", score: coverage, detail: `${snap.tickets.open} tickets in flight` },
      { key: "payroll", label: "Payroll Status", score: payroll, detail: `${snap.payroll.approved}/${snap.payroll.runs} runs approved` },
      { key: "compliance", label: "Compliance Health", score: compliance, detail: `${snap.compliance.open} open events` },
      { key: "training", label: "Training Progress", score: training, detail: `${snap.training.completed} completed` },
      { key: "client", label: "Client Satisfaction", score: client, detail: `${snap.tickets.rejected} rejections` },
      { key: "revenue", label: "Revenue Performance", score: revenue, detail: `$${Math.round(snap.invoices.revenue).toLocaleString()} invoiced` },
      { key: "risk", label: "Operational Risk", score: risk, detail: "Inverse risk index" },
      { key: "ai", label: "AI Confidence", score: ai, detail: `${snap.predictions.count} predictions` },
      { key: "capacity", label: "Workforce Capacity", score: capacity, detail: `${Math.round(snap.timeTickets.hours)} hrs logged` },
    ];
  }, [snap]);
}

export function useRiskModel(snap: OicSnapshot): RiskItem[] {
  return useMemo(() => {
    const overCapacity = snap.workers.active ? snap.timeTickets.hours / (snap.workers.active * 40) : 0;
    return [
      { key: "operational", label: "Operational Risk", level: clamp(snap.tickets.open * 4), detail: `${snap.tickets.open} unresolved tickets` },
      { key: "compliance", label: "Compliance Risk", level: clamp(snap.compliance.open * 12), detail: `${snap.compliance.open} open compliance events` },
      { key: "payroll", label: "Payroll Risk", level: clamp((snap.payroll.runs - snap.payroll.approved) * 20), detail: "Unapproved payroll runs" },
      { key: "staffing", label: "Staffing Risk", level: clamp(100 - pct(snap.jobs.filled, snap.jobs.needed || 1)), detail: "Unfilled positions" },
      { key: "burnout", label: "Burnout Risk", level: clamp(overCapacity > 1 ? (overCapacity - 1) * 200 : overCapacity * 30), detail: "Hours vs. capacity" },
      { key: "safety", label: "Safety Risk", level: clamp(snap.training.expired * 15), detail: `${snap.training.expired} expired certifications` },
      { key: "customer", label: "Customer Risk", level: clamp(snap.tickets.rejected * 15), detail: `${snap.tickets.rejected} rejected tickets` },
      { key: "scheduling", label: "Scheduling Risk", level: clamp(snap.timeTickets.pending * 5), detail: `${snap.timeTickets.pending} pending time tickets` },
      { key: "financial", label: "Financial Risk", level: clamp(snap.invoices.overdue * 18), detail: `${snap.invoices.overdue} overdue invoices` },
      { key: "confidence", label: "Prediction Confidence", level: clamp(100 - (snap.predictions.avgConfidence || 60)), detail: "Inverse AI confidence" },
    ];
  }, [snap]);
}

export interface OicEvent {
  id: string;
  name: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

/** Live platform-wide event stream (TTOS event bus) with realtime updates. */
export function useLiveEventStream(limit = 60) {
  const { agencyId } = useAuth();
  const [events, setEvents] = useState<OicEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    const { data } = await sb
      .from("ttos_events")
      .select("id,name,module,entity_type,entity_id,status,created_at,metadata")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setEvents((data ?? []) as OicEvent[]);
  }, [agencyId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!agencyId) return;
    const channel = supabase
      .channel(`oic-events-${agencyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ttos_events", filter: `agency_id=eq.${agencyId}` },
        (payload) => {
          setEvents((prev) => [payload.new as OicEvent, ...prev].slice(0, limit));
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agencyId, limit]);

  return { events, connected, refresh: load };
}

/** Mission Control widget layout, persisted per user in localStorage. */
export const OIC_WIDGETS = [
  { key: "health", label: "Health Grid" },
  { key: "kpis", label: "Executive KPIs" },
  { key: "risks", label: "Risk Alerts" },
  { key: "events", label: "Live Event Feed" },
  { key: "pipeline", label: "Recruiting Pipeline" },
  { key: "assignments", label: "Assignment Status" },
  { key: "financial", label: "Financial Overview" },
  { key: "heatmap", label: "Coverage Heat Map" },
  { key: "insights", label: "AI Insights" },
  { key: "timeline", label: "Operational Timeline" },
  { key: "compliance", label: "Compliance Timeline" },
  { key: "forecast", label: "Future Forecasts" },
] as const;

export type WidgetKey = (typeof OIC_WIDGETS)[number]["key"];

const STORAGE_KEY = "oic.mission-control.layout";

export function useWidgetLayout() {
  const [order, setOrder] = useState<WidgetKey[]>(() => OIC_WIDGETS.map((w) => w.key));
  const [hidden, setHidden] = useState<WidgetKey[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: WidgetKey[]; hidden?: WidgetKey[] };
      const valid = (k: string): k is WidgetKey => OIC_WIDGETS.some((w) => w.key === k);
      const stored = (parsed.order ?? []).filter(valid);
      const missing = OIC_WIDGETS.map((w) => w.key).filter((k) => !stored.includes(k));
      setOrder([...stored, ...missing]);
      setHidden((parsed.hidden ?? []).filter(valid));
    } catch {
      /* ignore malformed layout */
    }
  }, []);

  const persist = useCallback((nextOrder: WidgetKey[], nextHidden: WidgetKey[]) => {
    setOrder(nextOrder);
    setHidden(nextHidden);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: nextOrder, hidden: nextHidden }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const move = useCallback(
    (key: WidgetKey, dir: -1 | 1) => {
      const i = order.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      persist(next, hidden);
    },
    [order, hidden, persist],
  );

  const toggle = useCallback(
    (key: WidgetKey) => {
      persist(order, hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
    },
    [order, hidden, persist],
  );

  const reset = useCallback(() => persist(OIC_WIDGETS.map((w) => w.key), []), [persist]);

  const visible = useMemo(() => order.filter((k) => !hidden.includes(k)), [order, hidden]);

  return { order, hidden, visible, move, toggle, reset };
}
