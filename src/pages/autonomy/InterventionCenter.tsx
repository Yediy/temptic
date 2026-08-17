import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { CapabilityState, GovernedAction, NotYetAvailable, OpsAssistant, Panel, RecordTable, StateBadge } from "@/components/autonomy/AutoBits";
import { useAutonomyPermissions, useCapability, useCapabilityList, useEngineMutation } from "@/hooks/autonomy/use-autonomy";
import { INTERVENTIONS, KILL_SCOPES, asArray, asRecord, interventionByKind, str, type KillScope } from "@/lib/autonomy/platform";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function InterventionCenter() {
  const coordinations = useCapabilityList("coordinations.list");
  const history = useCapabilityList("interventions.list");
  const killStatus = useCapability<Record<string, unknown>>("killswitch.status");
  const intervene = useEngineMutation("interventions.execute");
  const kill = useEngineMutation("killswitch.activate");
  const { canIntervene, can } = useAutonomyPermissions();

  const [target, setTarget] = useState("");
  const [scope, setScope] = useState<KillScope>("coordination");
  const ks = asRecord(killStatus.data);

  const run = async (kind: string, reason: string) => {
    try {
      await intervene.mutateAsync({ kind, target_id: target, reason });
      toast({ title: `Intervention "${kind}" submitted to the engine.` });
    } catch (e) {
      toast({ title: "Intervention rejected", description: (e as Error).message, variant: "destructive" });
    }
  };

  const activateKill = async (reason: string) => {
    try {
      await kill.mutateAsync({ scope, target_id: target, reason });
      toast({ title: "Kill-switch activation submitted to the engine." });
    } catch (e) {
      toast({ title: "Kill switch rejected", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Intervention Center" description="Human control over live autonomous operations. Every control is executed by the engine and recorded in the ledger.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="target">Target</label>
            <select id="target" value={target} onChange={(e) => setTarget(e.target.value)}
              className="h-9 min-w-[16rem] rounded-md border bg-background px-2 text-sm">
              <option value="">Select a coordination, task or actor…</option>
              {coordinations.rows.map((c, i) => (
                <option key={str(c.id, String(i))} value={str(c.id)}>{str(c.objective ?? c.name ?? c.id)}</option>
              ))}
            </select>
            {coordinations.status === "pending" && (
              <span className="text-[11px] text-amber-400">Targets unavailable — engine capability pending.</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {INTERVENTIONS.filter((i) => i.kind !== "kill_switch").map((def) => (
              <GovernedAction key={def.kind} def={def}
                disabled={!target || !canIntervene(def) || !can(def.capability)}
                onConfirm={({ reason }) => run(def.kind, reason)} />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Controls are disabled until a target is selected and your identity carries the required authority.
          </p>
        </div>
      </Panel>

      <Panel tone="danger" title="Kill Switch" description="Emergency halt of autonomous activity. Never hidden inside a menu.">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="kill-scope">Scope</label>
              <select id="kill-scope" value={scope} onChange={(e) => setScope(e.target.value as KillScope)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
                {KILL_SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {KILL_SCOPES.find((s) => s.key === scope)?.detail}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="kill-target">Scope identifier</label>
              <Input id="kill-target" value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="Actor, coordination, domain or tenant id" className="mt-1" />
            </div>
          </div>

          <CapabilityState status={killStatus.status} message={killStatus.message} label="kill-switch status">
            <dl className="grid gap-1 text-xs md:grid-cols-2">
              {[
                ["Affected organisms", str(ks.affected_organisms, "—")],
                ["Affected tasks", str(ks.affected_tasks, "—")],
                ["Expected consequences", str(ks.expected_consequences, "—")],
                ["Recovery procedure", str(ks.recovery_procedure, "—")],
                ["Current state", str(ks.state, "—")],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-2">
                  <dt className="w-44 shrink-0 text-muted-foreground">{l}</dt><dd className="flex-1">{v}</dd>
                </div>
              ))}
            </dl>
            {asArray(ks.history).length > 0 && (
              <ul className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                {asArray(ks.history).map((h, i) => (
                  <li key={i}>{str(h.at ?? h.created_at)} — {str(h.scope)} halted by {str(h.actor)}</li>
                ))}
              </ul>
            )}
          </CapabilityState>

          <div className="flex flex-wrap items-center gap-3">
            <GovernedAction def={interventionByKind("kill_switch")}
              disabled={!can("killswitch.activate") || !target}
              onConfirm={({ reason }) => activateKill(reason)} />
            {!can("killswitch.activate") && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Kill-switch activation is restricted to explicitly authorized identities.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Intervention History" description="Human interventions recorded by the engine.">
        <CapabilityState status={history.status} message={history.message} label="intervention history">
          {history.rows.length === 0
            ? <NotYetAvailable label="Interventions" detail="The engine recorded no human interventions." />
            : (
              <RecordTable rows={history.rows} columns={[
                { key: "at", label: "When", render: (r) => str(r.at ?? r.created_at, "—") },
                { key: "kind", label: "Intervention" },
                { key: "target", label: "Target" },
                { key: "actor", label: "Human" },
                { key: "reason", label: "Reason" },
                { key: "outcome", label: "Outcome", render: (r) => <StateBadge state={r.outcome ?? r.state} /> },
              ]} />
            )}
        </CapabilityState>
      </Panel>

      <OpsAssistant context={{ target, interventions: history.rows }} tasks={["stop_impact", "why_paused", "needs_me"]} />
    </div>
  );
}
