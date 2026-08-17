import { useState } from "react";
import { CapabilityState, OpsAssistant, Panel, RecordTable, RiskBadge, StateBadge, AuthorityBadge, NotYetAvailable } from "@/components/autonomy/AutoBits";
import { useCapability, useCapabilityList, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { asArray, asRecord, str } from "@/lib/autonomy/platform";

export default function LiveCoordinations() {
  const [settings] = useAutonomySettings();
  const [selected, setSelected] = useState<string | null>(null);
  const list = useCapabilityList("coordinations.list", {}, { refetchInterval: settings.refreshMs });
  const detail = useCapability<Record<string, unknown>>("coordinations.detail", { id: selected }, { enabled: !!selected });
  const d = asRecord(detail.data);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Active Coordinations" description="Objective → plan → workstream → task → actor.">
        <CapabilityState status={list.status} message={list.message} label="live coordinations">
          <RecordTable
            rows={list.rows}
            columns={[
              { key: "objective", label: "Objective", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline"
                  onClick={() => setSelected(str(r.id))}>
                  {str(r.objective ?? r.name ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <StateBadge state={r.status ?? r.state} /> },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "authority_level", label: "Authority", render: (r) => <AuthorityBadge level={r.authority_level} /> },
              { key: "approval_state", label: "Approval" },
              { key: "expected_completion", label: "Expected" },
            ]}
          />
        </CapabilityState>
      </Panel>

      <Panel title="Coordination Detail" description="Drill down from objective to individual action.">
        {!selected && <p className="text-sm text-muted-foreground">Select a coordination to inspect it.</p>}
        {selected && (
          <CapabilityState status={detail.status} message={detail.message} label="this coordination">
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge state={d.status ?? d.state} />
                <RiskBadge risk={d.risk} />
                <AuthorityBadge level={d.authority_level} />
              </div>
              <p className="font-medium">{str(d.objective ?? d.name, "—")}</p>
              {d.plan && <p className="text-muted-foreground">Plan: {str(asRecord(d.plan).name ?? d.plan)}</p>}

              {["workstreams", "tasks", "actors", "dependencies", "resources", "bottlenecks"].map((key) => {
                const rows = asArray(d[key]);
                return (
                  <div key={key}>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
                    {rows.length === 0
                      ? <NotYetAvailable label={key} detail={`The engine returned no ${key} for this coordination.`} />
                      : (
                        <ul className="mt-1 space-y-1">
                          {rows.map((row, i) => (
                            <li key={str(row.id, String(i))} className="flex items-center gap-2 border-b py-1 last:border-0">
                              <span className="flex-1 truncate">{str(row.name ?? row.label ?? row.id, "—")}</span>
                              <StateBadge state={row.status ?? row.state} />
                              <RiskBadge risk={row.risk} />
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                );
              })}
              {d.expected_completion && (
                <p className="text-muted-foreground">Expected completion: {str(d.expected_completion)}</p>
              )}
            </div>
          </CapabilityState>
        )}
      </Panel>

      <div className="lg:col-span-2">
        <OpsAssistant context={{ coordinations: list.rows, selected: d }} />
      </div>
    </div>
  );
}
