import { useState } from "react";
import { CapabilityState, OpsAssistant, Panel, RecordTable, RiskBadge, StateBadge } from "@/components/autonomy/AutoBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCapabilityList } from "@/hooks/autonomy/use-autonomy";
import { GOVERNANCE_CHAIN, str } from "@/lib/autonomy/platform";

const FILTERS: Array<[string, string]> = [
  ["actor", "Actor"], ["human", "Human"], ["agent", "AI agent"], ["robot", "Robot"],
  ["objective", "Objective"], ["task", "Task"], ["action", "Action"], ["authority", "Authority"],
  ["approval", "Approval"], ["risk", "Risk"], ["domain", "Platform domain"], ["outcome", "Outcome"],
  ["incident", "Incident"], ["from", "From date"], ["to", "To date"],
];

export default function AutonomyLedger() {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [query, setQuery] = useState<Record<string, string>>({});
  const list = useCapabilityList("ledger.query", query);

  return (
    <div className="space-y-4">
      <Panel title="Governance chain" description="Every ledger entry resolves the full chain of authority behind an autonomous action.">
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {GOVERNANCE_CHAIN.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className="rounded border px-1.5 py-0.5">{step}</span>
              {i < GOVERNANCE_CHAIN.length - 1 && <span className="text-muted-foreground">→</span>}
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Autonomy Ledger" description="Searchable audit history served by the engine's audit store. No copy is held in this interface."
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setQuery({ ...draft })}>Search</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft({}); setQuery({}); }}>Reset</Button>
          </div>
        }>
        <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {FILTERS.map(([key, label]) => (
            <div key={key}>
              <label className="text-[11px] text-muted-foreground" htmlFor={`f-${key}`}>{label}</label>
              <Input id={`f-${key}`} value={draft[key] ?? ""} className="mt-0.5 h-8 text-xs"
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
            </div>
          ))}
        </div>

        <CapabilityState status={list.status} message={list.message} label="the autonomy ledger">
          <RecordTable rows={list.rows} columns={[
            { key: "at", label: "When", render: (r) => str(r.at ?? r.created_at, "—") },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "authority", label: "Authority" },
            { key: "approval", label: "Approval" },
            { key: "constitution", label: "Constitution" },
            { key: "contract", label: "Contract" },
            { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
            { key: "outcome", label: "Outcome", render: (r) => <StateBadge state={r.outcome ?? r.state} /> },
          ]} />
        </CapabilityState>
      </Panel>

      <OpsAssistant context={{ ledger_filter: query, entries: list.rows.slice(0, 40) }} tasks={["actor_actions", "explain_authority"]} />
    </div>
  );
}
