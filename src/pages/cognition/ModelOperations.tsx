import { useState } from "react";
import {
  CapabilityState, ListControls, Pager, Panel, PrivacyNotice, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { formatCost, formatLatency, str } from "@/lib/cognition/platform";

/** Provider-neutral. No provider is privileged and no credential is ever shown. */
export default function ModelOperations() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const list = useCognitiveList("models.operations", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Model Operations"
        description="Provider-neutral view of model health, usage, cost and fallback state."
      >
        <CapabilityState status={list.status} message={list.message} label="model operations">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter models…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "provider", label: "Provider" },
              { key: "model", label: "Model", className: "font-mono text-xs" },
              { key: "capability", label: "Capability" },
              { key: "health", label: "Health" },
              { key: "latency", label: "Latency", render: (r) => formatLatency(r.latency_ms ?? r.latency) },
              { key: "usage", label: "Usage", render: (r) => str(r.usage ?? r.calls, "—") },
              { key: "cost", label: "Cost", render: (r) => formatCost(r.cost) },
              { key: "failure_rate", label: "Failure Rate", render: (r) => str(r.failure_rate, "—") },
              { key: "fallback_status", label: "Fallback", render: (r) => str(r.fallback_status, "—") },
              { key: "privacy_classification", label: "Privacy Class", render: (r) => str(r.privacy_classification, "—") },
            ]}
            empty="No model operations have been reported."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      <p className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
        API keys, endpoints and provider credentials are held exclusively by the backend and are never transmitted
        to this workspace.
      </p>
      <PrivacyNotice />
    </div>
  );
}
