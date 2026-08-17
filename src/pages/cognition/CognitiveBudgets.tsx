import { useState } from "react";
import {
  CapabilityState, ListControls, Metric, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  useCognitiveCapability, useCognitiveList, useCognitionPermissions,
  useCognitionSettings, useRowFilter,
} from "@/hooks/cognition/use-cognition";
import { asRecord, formatCost, formatLatency, str } from "@/lib/cognition/platform";

type Scope = "tenant" | "session";

export default function CognitiveBudgets() {
  const [settings] = useCognitionSettings();
  const { canTenantBudgets } = useCognitionPermissions();
  const [scope, setScope] = useState<Scope>(canTenantBudgets ? "tenant" : "session");
  const [query, setQuery] = useState("");

  const totals = useCognitiveCapability<Record<string, unknown>>(
    "budgets.usage", { scope, view: "summary" }, { refetchInterval: settings.refreshMs },
  );
  const rows = useCognitiveList("budgets.usage", { scope, view: "detail" }, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(rows.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const summary = asRecord(totals.data);

  const TILES: Array<{ key: string; label: string; format?: (v: unknown) => string }> = [
    { key: "token_consumption", label: "Token Consumption" },
    { key: "compute", label: "Compute" },
    { key: "latency", label: "Latency", format: formatLatency },
    { key: "retrieval_calls", label: "Retrieval Calls" },
    { key: "tool_calls", label: "Tool Calls" },
    { key: "simulation_calls", label: "Simulation Calls" },
    { key: "optimization_calls", label: "Optimization Calls" },
    { key: "estimated_cost", label: "Estimated Cost", format: formatCost },
  ];

  return (
    <div className="space-y-4">
      <Panel
        title="Cognitive Budgets"
        description="Consumption of the resources cognition spends."
        actions={
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Budget scope">
            {(["tenant", "session"] as Scope[])
              .filter((s) => s !== "tenant" || canTenantBudgets)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded px-2 py-1 text-xs ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {s === "tenant" ? "Organization" : "Session"}
                </button>
              ))}
          </div>
        }
      >
        <CapabilityState status={totals.status} message={totals.message} label="cognitive budget usage">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TILES.map((t) => {
              const raw = summary[t.key];
              return <Metric key={t.key} label={t.label} value={raw == null ? "—" : t.format ? t.format(raw) : str(raw)} />;
            })}
          </div>
        </CapabilityState>
      </Panel>

      <Panel title={scope === "tenant" ? "Consumption by Session" : "Consumption by Request"}>
        <CapabilityState status={rows.status} message={rows.message} label="budget detail">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter budget records…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "subject", label: "Subject", render: (r) => str(r.subject ?? r.session_id ?? r.request_id, "—") },
              { key: "tokens", label: "Tokens", render: (r) => str(r.tokens ?? r.token_consumption, "—") },
              { key: "retrieval_calls", label: "Retrieval" },
              { key: "tool_calls", label: "Tools" },
              { key: "simulation_calls", label: "Simulations" },
              { key: "optimization_calls", label: "Optimizations" },
              { key: "latency", label: "Latency", render: (r) => formatLatency(r.latency_ms ?? r.latency) },
              { key: "estimated_cost", label: "Estimated Cost", render: (r) => formatCost(r.estimated_cost ?? r.cost) },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>
    </div>
  );
}
