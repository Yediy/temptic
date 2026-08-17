import { useState } from "react";
import { ActorBadge, CapabilityState, NotYetAvailable, OpsAssistant, Panel, RiskBadge } from "@/components/autonomy/AutoBits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutonomyPermissions, useCapabilityList, useEngineMutation, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { asArray, asRecord, str } from "@/lib/autonomy/platform";
import { toast } from "@/hooks/use-toast";

const DECISIONS = [
  { key: "approve", label: "Approve", variant: "default" as const },
  { key: "reject", label: "Reject", variant: "destructive" as const },
  { key: "modify", label: "Modify", variant: "outline" as const },
  { key: "request_info", label: "Request more information", variant: "secondary" as const },
  { key: "escalate", label: "Escalate", variant: "outline" as const },
];

export default function ApprovalQueue() {
  const [settings] = useAutonomySettings();
  const list = useCapabilityList("approvals.list", {}, { refetchInterval: settings.refreshMs });
  const decide = useEngineMutation("approvals.decide");
  const { can } = useAutonomyPermissions();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const authorized = can("approvals.decide");

  const submit = async (id: string, decision: string) => {
    try {
      await decide.mutateAsync({ approval_id: id, decision, note: notes[id] ?? "" });
      toast({ title: `Decision "${decision}" submitted to the engine.` });
    } catch (e) {
      toast({ title: "Decision rejected", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Approval Queue" description="Actions autonomous actors may not take without human approval.">
        <CapabilityState status={list.status} message={list.message} label="the approval queue">
          {list.rows.length === 0 ? (
            <NotYetAvailable label="Approvals" detail="The engine reported no actions awaiting human approval." />
          ) : (
            <div className="space-y-3">
              {list.rows.map((a, i) => {
                const id = str(a.id, String(i));
                return (
                  <article key={id} className="rounded-md border p-3 text-sm">
                    <header className="flex flex-wrap items-center gap-2">
                      <ActorBadge type={a.actor_type} />
                      <span className="min-w-0 flex-1 truncate font-medium">{str(a.requested_action ?? a.action, "—")}</span>
                      <RiskBadge risk={a.risk} />
                      {a.deadline && <span className="text-[11px] text-amber-400">Due {str(a.deadline)}</span>}
                    </header>
                    <dl className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                      {[
                        ["Requesting actor", str(a.actor ?? a.requesting_actor, "—")],
                        ["Objective", str(a.objective, "—")],
                        ["Reason", str(a.reason, "—")],
                        ["Confidence", a.confidence == null ? "—" : `${Math.round(Number(a.confidence) * 100)}%`],
                        ["Expected outcome", str(a.expected_outcome, "—")],
                        ["Simulation result", str(asRecord(a.simulation).summary ?? a.simulation_result ?? "—")],
                        ["Optimization result", str(asRecord(a.optimization).summary ?? a.optimization_result ?? "—")],
                        ["Constraints", Array.isArray(a.constraints) ? (a.constraints as unknown[]).map(String).join("; ") : "—"],
                        ["Authority gap", str(a.authority_gap, "—")],
                        ["Policy", str(a.policy, "—")],
                        ["Constitution", Array.isArray(a.constitution_refs) ? (a.constitution_refs as unknown[]).map(String).join(", ") : str(a.constitution_refs, "—")],
                        ["Approver", str(a.approver, "—")],
                      ].map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
                          <dd className="min-w-0 flex-1">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {authorized ? (
                      <div className="mt-3 space-y-2">
                        <Textarea rows={2} placeholder="Decision note (recorded in the Autonomy Ledger)"
                          value={notes[id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))} />
                        <div className="flex flex-wrap gap-2">
                          {DECISIONS.map((d) => (
                            <Button key={d.key} type="button" size="sm" variant={d.variant}
                              disabled={decide.isPending} onClick={() => submit(id, d.key)}>
                              {d.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        You may review this request but you are not an authorized approver.
                      </p>
                    )}
                    {asArray(a.evidence).length > 0 && (
                      <ul className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                        {asArray(a.evidence).map((e, j) => <li key={j}>{str(e.label ?? e.source)}: {str(e.value ?? e.ref)}</li>)}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ approvals: list.rows }} tasks={["needs_me", "why_escalated", "highest_risk"]} />
    </div>
  );
}
