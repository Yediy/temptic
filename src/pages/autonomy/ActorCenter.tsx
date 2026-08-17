import { useState } from "react";
import { ActorBadge, AuthorityBadge, CapabilityState, NotYetAvailable, OpsAssistant, Panel, RiskBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { ACTOR_TYPES, asArray, asRecord, str } from "@/lib/autonomy/platform";
import { cn } from "@/lib/utils";

export default function ActorCenter() {
  const [settings] = useAutonomySettings();
  const [type, setType] = useState<string>("");
  const list = useCapabilityList("actors.list", type ? { type } : {}, { refetchInterval: settings.refreshMs });
  const rows = list.rows;

  return (
    <div className="space-y-4">
      <Panel
        title="Actor Center"
        description="Every participating human, AI agent, automation, Platform Organism, robot and machine."
        actions={
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by actor type">
            <button type="button" onClick={() => setType("")}
              className={cn("rounded border px-2 py-0.5 text-[11px]", !type && "border-primary text-primary")}>All</button>
            {ACTOR_TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setType(t.key)}
                className={cn("rounded border px-2 py-0.5 text-[11px]", type === t.key && "border-primary text-primary")}>
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        <CapabilityState status={list.status} message={list.message} label="actors">
          {rows.length === 0 ? (
            <NotYetAvailable label="Actors" detail="The engine returned no actors for this organization." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((a, i) => (
                <article key={str(a.id, String(i))} className="rounded-md border bg-card p-3 text-sm">
                  <header className="flex flex-wrap items-center gap-2">
                    <ActorBadge type={a.type} />
                    <span className="min-w-0 flex-1 truncate font-medium">{str(a.name ?? a.identity ?? a.id, "—")}</span>
                    <RiskBadge risk={a.risk} />
                  </header>
                  <dl className="mt-2 space-y-1 text-xs">
                    <Row label="Assignment" value={str(a.current_assignment, "—")} />
                    <Row label="Capabilities" value={Array.isArray(a.capabilities) ? (a.capabilities as unknown[]).map(String).join(", ") : "—"} />
                    <Row label="Authority" value={<AuthorityBadge level={a.authority_level} />} />
                    <Row label="Envelope" value={str(asRecord(a.authority_envelope).summary ?? a.authority_envelope ?? "—")} />
                    <Row label="Health" value={str(a.health, "—")} />
                    <Row label="Tasks" value={Array.isArray(a.tasks) ? String((a.tasks as unknown[]).length) : str(a.task_count, "—")} />
                    <Row label="Performance" value={str(a.performance ?? asRecord(a.performance).score ?? "—")} />
                    <Row label="Dependencies" value={Array.isArray(a.dependencies) ? (a.dependencies as unknown[]).map(String).join(", ") : "—"} />
                  </dl>
                  {asArray(a.recent_actions).length > 0 && (
                    <ul className="mt-2 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
                      {asArray(a.recent_actions).slice(0, 5).map((act, j) => (
                        <li key={j} className="truncate">{str(act.action ?? act.name)} — {str(act.outcome ?? act.status)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ actors: rows }} tasks={["underperforming", "actor_actions", "explain_authority"]} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{value}</dd>
    </div>
  );
}
