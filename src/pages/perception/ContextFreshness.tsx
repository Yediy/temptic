import { useState } from "react";
import { ListControls, MetadataBlock, Metric, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, FreshnessBadge, PrivacyNotice, UnresolvedFlag } from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { FRESHNESS_STATES, asArray, formatTime, str, type FreshnessState } from "@/lib/perception/platform";

export default function ContextFreshness() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList(
    "freshness.list",
    state ? { freshness: state } : {},
    { refetchInterval: settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const counts = FRESHNESS_STATES.map((f) => ({
    state: f,
    n: list.rows.filter((r) => str(r.freshness).toUpperCase() === f).length,
  }));

  return (
    <div className="space-y-4">
      {list.status === "ok" && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {counts.map((c) => (
            <Metric
              key={c.state}
              label={c.state}
              value={c.n}
              tone={c.state === "EXPIRED" ? "danger" : c.state === "STALE" ? "warn" : c.state === "CURRENT" ? "ok" : undefined}
              hint="reported by 6.1A"
            />
          ))}
        </div>
      )}

      <Panel
        title="Context Freshness"
        description="How current each piece of context is, and which requests depend on it."
      >
        <CapabilityState status={list.status} message={list.message} label="context freshness">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter context items…">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              aria-label="Filter by freshness state"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All freshness</option>
              {FRESHNESS_STATES.map((f: FreshnessState) => <option key={f} value={f}>{f}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "context_item", label: "Context Item", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.context_item ?? r.item ?? r.id, "(unnamed item)")}
                </button>
              ) },
              { key: "source", label: "Source" },
              { key: "last_updated", label: "Last Updated", render: (r) => formatTime(r.last_updated ?? r.updated_at) },
              { key: "age", label: "Age", render: (r) => str(r.age, "—") },
              { key: "freshness", label: "Freshness", render: (r) => <FreshnessBadge value={r.freshness} /> },
              { key: "expiration_policy", label: "Expiration Policy", render: (r) => str(r.expiration_policy, "—") },
              { key: "dependent_requests", label: "Dependent Requests", render: (r) => {
                const n = asArray(r.dependent_requests).length;
                return n ? `${n}` : str(r.dependent_requests, "—");
              } },
              { key: "refresh_required", label: "Refresh", render: (r) =>
                r.refresh_required ? <UnresolvedFlag>refresh required</UnresolvedFlag> : str(r.refresh_required, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Freshness Detail" description="Refresh state is reported by 6.1A; the workspace does not trigger refreshes.">
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
