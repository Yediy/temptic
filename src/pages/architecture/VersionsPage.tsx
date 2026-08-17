import { useState } from "react";
import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistry, useRegistryList } from "@/hooks/architecture/use-architecture";
import { VERSION_KINDS, asArray, asRecord, str, type VersionKind } from "@/lib/architecture/platform";

export default function VersionsPage() {
  const [kind, setKind] = useState<VersionKind>("architecture");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const versions = useRegistryList("versions.list", { kind });
  const { filtered, input } = useRowSearch(versions.rows);
  const comparison = useRegistry<Record<string, unknown>>(
    "versions.compare",
    { kind, from, to },
    { enabled: !!from && !!to },
  );
  const diff = asArray(asRecord(comparison.data).changes);

  return (
    <div className="space-y-3">
      <Panel
        title="Version Explorer"
        description="Evolution of the architecture as recorded by the registry."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as VersionKind)}
              aria-label="Version family" className="h-8 rounded-md border bg-background px-2 text-xs">
              {VERSION_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            {input}
          </div>
        }
      >
        <RegistryState status={versions.status} message={versions.message} label="version records">
          <RecordTable
            rows={filtered}
            empty="The registry contains no versions for this family."
            columns={[
              { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs font-semibold">{str(r.version ?? r.id, "—")}</span> },
              { key: "subject", label: "Subject", render: (r) => <span>{str(r.subject ?? r.name, "—")}</span> },
              { key: "status", label: "Status" },
              { key: "released_at", label: "Released", render: (r) => <span className="text-xs">{str(r.released_at ?? r.created_at, "—")}</span> },
              { key: "summary", label: "Summary" },
            ]}
          />
        </RegistryState>
      </Panel>

      <Panel title="Compare Versions" description="Comparison is computed by the registry, not by this console.">
        <div className="mb-3 flex flex-wrap gap-2">
          <VersionSelect label="From" value={from} onChange={setFrom} rows={filtered} />
          <VersionSelect label="To" value={to} onChange={setTo} rows={filtered} />
        </div>
        {!from || !to
          ? <p className="text-sm text-muted-foreground">Select two versions to compare.</p>
          : (
            <RegistryState status={comparison.status} message={comparison.message} label="the version comparison">
              {diff.length === 0
                ? <p className="text-sm text-muted-foreground">The registry reports no differences between these versions.</p>
                : (
                  <ul className="space-y-1 text-sm">
                    {diff.map((c, i) => (
                      <li key={i} className="border-b py-1 last:border-0">
                        <span className="mr-2 font-mono text-[11px] uppercase text-muted-foreground">{str(c.type ?? c.kind)}</span>
                        {str(c.subject ?? c.component)} — {str(c.summary ?? c.detail)}
                      </li>
                    ))}
                  </ul>
                )}
            </RegistryState>
          )}
      </Panel>
    </div>
  );
}

function VersionSelect({ label, value, onChange, rows }: {
  label: string; value: string; onChange: (v: string) => void; rows: Record<string, unknown>[];
}) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
        <option value="">Select…</option>
        {rows.map((r, i) => {
          const v = str(r.version ?? r.id, String(i));
          return <option key={`${v}-${i}`} value={v}>{v} {str(r.subject ?? r.name)}</option>;
        })}
      </select>
    </label>
  );
}
