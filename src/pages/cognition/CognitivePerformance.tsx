import { useState } from "react";
import {
  CapabilityState, ListControls, Metric, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  useCognitiveCapability, useCognitiveList, useCognitionSettings, useRowFilter,
} from "@/hooks/cognition/use-cognition";
import { asRecord, formatCost, formatLatency, str } from "@/lib/cognition/platform";

const TILES: Array<{ key: string; label: string; format?: (v: unknown) => string }> = [
  { key: "requests_completed", label: "Requests Completed" },
  { key: "requests_failed", label: "Requests Failed" },
  { key: "latency_p50", label: "Latency (p50)", format: formatLatency },
  { key: "latency_p95", label: "Latency (p95)", format: formatLatency },
  { key: "throughput", label: "Throughput" },
  { key: "evidence_coverage", label: "Evidence Coverage" },
  { key: "escalation_rate", label: "Escalation Rate" },
  { key: "cost_per_request", label: "Cost per Request", format: formatCost },
];

export default function CognitivePerformance() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const metrics = useCognitiveCapability<Record<string, unknown>>(
    "performance.metrics", { view: "summary" }, { refetchInterval: settings.refreshMs },
  );
  const byFaculty = useCognitiveList("performance.metrics", { view: "by_faculty" }, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(byFaculty.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const summary = asRecord(metrics.data);

  return (
    <div className="space-y-4">
      <Panel title="Cognitive Performance" description="Latency, reliability and cost efficiency of cognition.">
        <CapabilityState status={metrics.status} message={metrics.message} label="cognitive performance metrics">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TILES.map((t) => {
              const raw = summary[t.key];
              return <Metric key={t.key} label={t.label} value={raw == null ? "—" : t.format ? t.format(raw) : str(raw)} />;
            })}
          </div>
        </CapabilityState>
      </Panel>

      <Panel title="Performance by Faculty">
        <CapabilityState status={byFaculty.status} message={byFaculty.message} label="per-faculty performance">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter faculties…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "faculty", label: "Faculty", render: (r) => str(r.faculty ?? r.name, "—") },
              { key: "invocations", label: "Invocations" },
              { key: "success_rate", label: "Success Rate" },
              { key: "latency_p95", label: "Latency (p95)", render: (r) => formatLatency(r.latency_p95 ?? r.latency) },
              { key: "escalations", label: "Escalations" },
              { key: "cost", label: "Cost", render: (r) => formatCost(r.cost) },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>
    </div>
  );
}
