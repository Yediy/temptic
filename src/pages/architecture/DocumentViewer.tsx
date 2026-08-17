import { useState } from "react";
import { EngineeringAssistant, KeyValue, Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { asRecord, list, str, type ArchCapabilityKey } from "@/lib/architecture/platform";

/**
 * Structured viewer shared by the Platform Contract, Capability Specification
 * and Platform DNA sections. It renders whatever the registry returns and
 * never supplies missing document content.
 */
export default function DocumentViewer({
  capability, title, description, kindLabel,
}: {
  capability: Extract<ArchCapabilityKey, "contracts.list" | "capspecs.list" | "dna.list">;
  title: string;
  description: string;
  kindLabel: string;
}) {
  const docs = useRegistryList(capability);
  const { filtered, input } = useRowSearch(docs.rows);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string>("");

  const key = (r: Record<string, unknown>) => str(r.id ?? r.code ?? r.name);
  const selected = filtered.find((r) => key(r) === selectedId) ?? null;
  const compare = filtered.find((r) => key(r) === compareId) ?? null;

  return (
    <div className="space-y-3">
      <Panel title={title} description={description} actions={input}>
        <RegistryState status={docs.status} message={docs.message} label={`registered ${kindLabel}`}>
          <RecordTable
            rows={filtered}
            empty={`The registry contains no ${kindLabel}.`}
            columns={[
              {
                key: "code", label: kindLabel,
                render: (r) => (
                  <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline"
                    onClick={() => setSelectedId(key(r))}>
                    {str(r.code ?? r.name ?? r.id, "—")}
                  </button>
                ),
              },
              { key: "title", label: "Title" },
              { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs">{str(r.version, "—")}</span> },
              { key: "owner", label: "Owner" },
              { key: "organisms", label: "Organisms", render: (r) => <span className="text-xs">{list(r.organisms).join(", ") || "—"}</span> },
              { key: "status", label: "Status" },
              { key: "updated_at", label: "Updated", render: (r) => <span className="text-xs">{str(r.updated_at ?? r.changed_at, "—")}</span> },
            ]}
          />
        </RegistryState>
      </Panel>

      {selected && (
        <Panel
          title={str(selected.code ?? selected.name, kindLabel)}
          description={str(selected.title)}
          actions={
            <select value={compareId} onChange={(e) => setCompareId(e.target.value)}
              aria-label="Compare with version" className="h-8 rounded-md border bg-background px-2 text-xs">
              <option value="">Compare with…</option>
              {filtered.filter((r) => key(r) !== selectedId).map((r) => (
                <option key={key(r)} value={key(r)}>{str(r.code ?? r.name)} {str(r.version)}</option>
              ))}
            </select>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record</h3>
              <KeyValue record={selected} />
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {compare ? `Comparison — ${str(compare.code ?? compare.name)} ${str(compare.version)}` : "Comparison"}
              </h3>
              {compare
                ? <FieldDiff a={selected} b={compare} />
                : <p className="text-sm text-muted-foreground">Select another record to compare versions.</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependencies</h3>
              {list(selected.dependencies).length === 0
                ? <p className="text-sm text-muted-foreground">No dependencies documented.</p>
                : <ul className="text-sm">{list(selected.dependencies).map((d) => <li key={d} className="font-mono text-xs">{d}</li>)}</ul>}
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Change history</h3>
              {!Array.isArray(selected.change_history) || (selected.change_history as unknown[]).length === 0
                ? <p className="text-sm text-muted-foreground">No change history documented.</p>
                : (
                  <ul className="space-y-1 text-sm">
                    {(selected.change_history as unknown[]).map((h, i) => {
                      const rec = asRecord(h);
                      return <li key={i}><span className="font-mono text-xs">{str(rec.version)}</span> — {str(rec.summary ?? rec.change)}</li>;
                    })}
                  </ul>
                )}
            </div>
          </div>
        </Panel>
      )}

      <EngineeringAssistant context={{ kind: kindLabel, selected, documents: filtered.slice(0, 40) }}
        tasks={["summarize_contract", "locate", "architecture_history"]} />
    </div>
  );
}

function FieldDiff({ a, b }: { a: Record<string, unknown>; b: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  const changed = keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  if (changed.length === 0) return <p className="text-sm text-muted-foreground">The two records are identical.</p>;
  return (
    <ul className="space-y-1.5 text-xs">
      {changed.map((k) => (
        <li key={k} className="border-b pb-1 last:border-0">
          <p className="font-medium">{k.replace(/_/g, " ")}</p>
          <p className="font-mono text-[11px] text-red-400">− {JSON.stringify(a[k]) ?? "—"}</p>
          <p className="font-mono text-[11px] text-emerald-400">+ {JSON.stringify(b[k]) ?? "—"}</p>
        </li>
      ))}
    </ul>
  );
}
