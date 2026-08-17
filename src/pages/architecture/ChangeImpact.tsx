import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EngineeringAssistant, Panel, RecordTable, RegistryState, SeverityBadge } from "@/components/architecture/ArchBits";
import { useRegistry } from "@/hooks/architecture/use-architecture";
import { IMPACT_SUBJECTS, asArray, asRecord, list, str, type ImpactSubject } from "@/lib/architecture/platform";

export default function ChangeImpact() {
  const [kind, setKind] = useState<ImpactSubject>("organism");
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");

  const impact = useRegistry<Record<string, unknown>>(
    "dependencies.impact",
    { subject_kind: kind, subject },
    { enabled: subject.length > 0 },
  );
  const report = asRecord(impact.data);

  return (
    <div className="space-y-3">
      <Panel title="Change Impact Analysis" description="Impact is computed by the Architecture Registry. This console approves nothing.">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setSubject(draft.trim()); }}
        >
          <select value={kind} onChange={(e) => setKind(e.target.value as ImpactSubject)}
            aria-label="Subject kind" className="h-9 rounded-md border bg-background px-2 text-xs">
            {IMPACT_SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Registry id or name of the subject being changed"
            aria-label="Impact subject"
            className="h-9 max-w-sm text-sm"
          />
          <Button type="submit" size="sm" disabled={!draft.trim()}>Analyse impact</Button>
        </form>
      </Panel>

      {!subject
        ? <Panel title="Impact Radius"><p className="text-sm text-muted-foreground">Select a subject to request an impact analysis.</p></Panel>
        : (
          <>
            <Panel title="Impact Radius" description={`Registry analysis for ${kind} “${subject}”.`}>
              <RegistryState status={impact.status} message={impact.message} label="the change impact analysis">
                <div className="space-y-4">
                  <ImpactList label="Directly affected" rows={asArray(report.direct)} />
                  <ImpactList label="Transitively affected" rows={asArray(report.transitive)} />
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Breaking-change risks</h3>
                    {asArray(report.risks).length === 0
                      ? <p className="text-sm text-muted-foreground">The registry reports no breaking-change risks.</p>
                      : (
                        <ul className="space-y-1 text-sm">
                          {asArray(report.risks).map((r, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2">
                              <SeverityBadge value={r.severity} />
                              <span>{str(r.detail ?? r.summary, "—")}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Bullets label="Required contract updates" values={list(report.contract_updates)} />
                    <Bullets label="Required migrations" values={list(report.migrations)} />
                    <Bullets label="Required test coverage" values={list(report.tests)} />
                    <Bullets label="Rollback considerations" values={list(report.rollback)} />
                  </div>
                </div>
              </RegistryState>
            </Panel>

            <EngineeringAssistant context={{ subject, kind, impact: report }}
              tasks={["affected_components", "explain_dependencies", "investigation_path"]} />
          </>
        )}
    </div>
  );
}

function ImpactList({ label, rows }: { label: string; rows: Record<string, unknown>[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      <RecordTable
        rows={rows}
        empty={`The registry reports nothing ${label.toLowerCase()}.`}
        columns={[
          { key: "name", label: "Component", render: (r) => <span className="font-medium">{str(r.name ?? r.organism ?? r.id, "—")}</span> },
          { key: "kind", label: "Kind", render: (r) => <span className="text-xs uppercase text-muted-foreground">{str(r.kind ?? r.type, "—")}</span> },
          { key: "relation", label: "Relation" },
          { key: "criticality", label: "Criticality" },
        ]}
      />
    </div>
  );
}

function Bullets({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      {values.length === 0
        ? <p className="text-sm text-muted-foreground">Not reported by the registry.</p>
        : <ul className="list-disc pl-4 text-sm">{values.map((v) => <li key={v}>{v}</li>)}</ul>}
    </div>
  );
}
