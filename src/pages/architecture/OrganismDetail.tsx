import { Link, useParams } from "react-router-dom";
import { EngineeringAssistant, KeyValue, Panel, RegistryState } from "@/components/architecture/ArchBits";
import { useRegistry } from "@/hooks/architecture/use-architecture";
import { ORGANISM_SECTIONS, asRecord, str } from "@/lib/architecture/platform";

export default function OrganismDetail() {
  const { organismId = "" } = useParams();
  const record = useRegistry<Record<string, unknown>>("organisms.detail", { id: organismId }, { enabled: !!organismId });
  const organism = asRecord(record.data);

  return (
    <div className="space-y-3">
      <Panel
        title={str(organism.name ?? organismId, "Organism")}
        description={str(organism.purpose) || "Canonical registry record."}
        actions={<Link to="/architecture/organisms" className="text-xs text-primary hover:underline">Back to organisms</Link>}
      >
        <RegistryState status={record.status} message={record.message} label="this organism record">
          <KeyValue record={organism} keys={ORGANISM_SECTIONS} />
        </RegistryState>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Dependencies" description="Upstream organisms this record declares.">
          <RegistryState status={record.status} message={record.message} label="dependencies">
            <DepList value={organism.dependencies} empty="No upstream dependencies documented." />
          </RegistryState>
        </Panel>
        <Panel title="Dependents" description="Downstream organisms that declare this one.">
          <RegistryState status={record.status} message={record.message} label="dependents">
            <DepList value={organism.dependents} empty="No dependents documented." />
          </RegistryState>
        </Panel>
      </div>

      <EngineeringAssistant context={{ organism }} />
    </div>
  );
}

function DepList({ value, empty }: { value: unknown; empty: string }) {
  const rows = Array.isArray(value) ? value : [];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {rows.map((raw, i) => {
        const r = asRecord(raw);
        const id = str(r.id ?? r.organism_id);
        const label = typeof raw === "string" ? raw : str(r.name ?? r.id, "—");
        return (
          <li key={`${label}-${i}`} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
            {id
              ? <Link to={`/architecture/organisms/${encodeURIComponent(id)}`} className="text-primary hover:underline">{label}</Link>
              : <span>{label}</span>}
            <span className="text-[11px] uppercase text-muted-foreground">{str(r.criticality ?? r.kind)}</span>
          </li>
        );
      })}
    </ul>
  );
}
