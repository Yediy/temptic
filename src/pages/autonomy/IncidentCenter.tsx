import { useState } from "react";
import { Link } from "react-router-dom";
import { CapabilityState, NotYetAvailable, OpsAssistant, Panel, RiskBadge, StateBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList } from "@/hooks/autonomy/use-autonomy";
import { asRecord, str } from "@/lib/autonomy/platform";
import { cn } from "@/lib/utils";

const KINDS: Array<[string, string]> = [
  ["", "All"],
  ["failed_operation", "Failed operations"],
  ["authority_violation_attempted", "Authority violations attempted"],
  ["authority_violation_prevented", "Authority violations prevented"],
  ["unexpected_outcome", "Unexpected outcomes"],
  ["rollback", "Rollback events"],
  ["kill_switch", "Kill-switch events"],
  ["safety_interruption", "Safety interruptions"],
  ["permission_failure", "Permission failures"],
  ["cross_system_failure", "Cross-system failures"],
  ["low_confidence_escalation", "Low-confidence escalations"],
];

const DRILL: Array<[string, string]> = [
  ["Timeline", "/timeline"], ["Graph", "/graph"], ["Knowledge", "/knowledge"],
  ["Communications", "/comms"], ["Simulation", "/simulation"], ["Optimization", "/optimization"],
  ["Decisions", "/woic/decisions"], ["Audit", "/activity/audit"],
];

export default function IncidentCenter() {
  const [kind, setKind] = useState("");
  const list = useCapabilityList("incidents.list", kind ? { kind } : {});

  return (
    <div className="space-y-4">
      <Panel title="Incident Center" description="Failures, prevented violations, rollbacks and safety interruptions reported by the engine."
        actions={
          <div className="flex flex-wrap gap-1">
            {KINDS.map(([k, label]) => (
              <button key={k || "all"} type="button" onClick={() => setKind(k)}
                className={cn("rounded border px-2 py-0.5 text-[11px]", kind === k && "border-primary text-primary")}>
                {label}
              </button>
            ))}
          </div>
        }>
        <CapabilityState status={list.status} message={list.message} label="incidents">
          {list.rows.length === 0 ? (
            <NotYetAvailable label="Incidents" detail="The engine reported no incidents for this filter." />
          ) : (
            <div className="space-y-2">
              {list.rows.map((inc, i) => (
                <article key={str(inc.id, String(i))} className="rounded-md border p-3 text-sm">
                  <header className="flex flex-wrap items-center gap-2">
                    <StateBadge state={inc.state ?? inc.status} />
                    <span className="min-w-0 flex-1 truncate font-medium">{str(inc.title ?? inc.kind ?? inc.id, "—")}</span>
                    <RiskBadge risk={inc.risk ?? inc.severity} />
                    <span className="text-[11px] text-muted-foreground">{str(inc.at ?? inc.created_at)}</span>
                  </header>
                  <p className="mt-1 text-xs text-muted-foreground">{str(inc.summary ?? inc.reason, "—")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Actor: {str(inc.actor, "—")} · Coordination: {str(inc.coordination, "—")} · Evidence: {str(asRecord(inc.evidence).ref ?? inc.evidence_ref ?? "—")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {DRILL.map(([label, to]) => (
                      <Link key={label} to={to} className="rounded border px-2 py-0.5 text-primary hover:bg-muted">
                        {label}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ incidents: list.rows, filter: kind }} tasks={["highest_risk", "why_escalated"]} />
    </div>
  );
}
