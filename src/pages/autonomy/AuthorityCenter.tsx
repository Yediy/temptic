import { useState } from "react";
import { AuthorityBadge, CapabilityState, GovernedAction, NotYetAvailable, OpsAssistant, Panel } from "@/components/autonomy/AutoBits";
import { useAutonomyPermissions, useCapabilityList, useEngineMutation } from "@/hooks/autonomy/use-autonomy";
import { AUTHORITY_LEVELS, asArray, interventionByKind, str } from "@/lib/autonomy/platform";
import { toast } from "@/hooks/use-toast";

const FIELDS: Array<[string, string]> = [
  ["permitted_actions", "Permitted actions"],
  ["prohibited_actions", "Prohibited actions"],
  ["resource_scope", "Resource scope"],
  ["data_scope", "Data scope"],
  ["financial_limit", "Financial limits"],
  ["risk_threshold", "Risk threshold"],
  ["geographic_scope", "Geographic scope"],
  ["delegation_rights", "Delegation rights"],
  ["approval_requirements", "Approval requirements"],
  ["expires_at", "Expiration"],
  ["constitution_refs", "Constitution references"],
  ["contract_refs", "Contract references"],
];

export default function AuthorityCenter() {
  const list = useCapabilityList("authority.list");
  const mutate = useEngineMutation("authority.mutate");
  const { can } = useAutonomyPermissions();
  const [level, setLevel] = useState<string>(AUTHORITY_LEVELS[0].key);
  const authorized = can("authority.mutate");

  const run = (action: string, envelopeId: string, reason: string) =>
    mutate.mutateAsync({ action, envelope_id: envelopeId, level, reason })
      .then(() => toast({ title: "Request submitted to the Autonomous Coordination Engine." }))
      .catch((e: Error) => toast({ title: "Request rejected", description: e.message, variant: "destructive" }));

  return (
    <div className="space-y-4">
      <Panel title="Authority Center" description="Delegated authority is granted, reduced and revoked by the engine under governed APIs. This interface only requests changes.">
        <CapabilityState status={list.status} message={list.message} label="authority envelopes">
          {list.rows.length === 0 ? (
            <NotYetAvailable label="Authority envelopes" detail="The engine returned no delegated authority envelopes." />
          ) : (
            <div className="space-y-3">
              {list.rows.map((env, i) => (
                <article key={str(env.id, String(i))} className="rounded-md border p-3">
                  <header className="flex flex-wrap items-center gap-2">
                    <AuthorityBadge level={env.authority_level ?? env.level} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {str(env.actor ?? env.subject ?? env.id, "—")}
                    </span>
                  </header>
                  <dl className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                    {FIELDS.map(([key, label]) => {
                      const v = env[key];
                      const text = Array.isArray(v) ? (v as unknown[]).map(String).join(", ") : v == null ? "—" : String(v);
                      return (
                        <div key={key} className="flex gap-2">
                          <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
                          <dd className="min-w-0 flex-1">{text}</dd>
                        </div>
                      );
                    })}
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!authorized && (
                      <p className="text-[11px] text-muted-foreground">
                        You may inspect authority but not change it. Authority changes require an explicitly authorized identity.
                      </p>
                    )}
                    {authorized && (
                      <>
                        <select aria-label="Target authority level" value={level} onChange={(e) => setLevel(e.target.value)}
                          className="h-8 rounded-md border bg-background px-2 text-xs">
                          {AUTHORITY_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                        </select>
                        <GovernedAction def={interventionByKind("reduce_authority")}
                          onConfirm={({ reason }) => run("reduce", str(env.id), reason)} />
                        <GovernedAction def={interventionByKind("revoke_authority")}
                          onConfirm={({ reason }) => run("revoke", str(env.id), reason)} />
                      </>
                    )}
                  </div>
                  {asArray(env.history).length > 0 && (
                    <ul className="mt-2 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
                      {asArray(env.history).slice(0, 5).map((h, j) => (
                        <li key={j}>{str(h.at ?? h.created_at)} — {str(h.action)} by {str(h.actor)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ envelopes: list.rows }} tasks={["explain_authority", "highest_risk"]} />
    </div>
  );
}
