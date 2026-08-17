import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

function ambiguous(row: Record<string, unknown>) {
  const owners = list(row.owners ?? row.owner);
  return owners.length > 1 || Boolean(row.ambiguous) || !str(row.owner ?? row.canonical_owner);
}

export default function DataOwnership() {
  const data = useRegistryList("data.ownership");
  const { filtered, input } = useRowSearch(data.rows);
  const flagged = filtered.filter(ambiguous);

  return (
    <div className="space-y-3">
      {flagged.length > 0 && (
        <Panel title="Ambiguous Ownership" description="Records where the registry does not name a single canonical owner." tone="danger">
          <ul className="space-y-1 text-sm">
            {flagged.map((r, i) => (
              <li key={i} className="font-mono text-xs text-amber-400">{str(r.entity ?? r.table ?? r.name, "—")}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Data Ownership Map" description="Canonical owner, readers, writers, projections and caches." actions={input}>
        <RegistryState status={data.status} message={data.message} label="the data ownership map">
          <RecordTable
            rows={filtered}
            empty="The registry declares no data ownership records."
            columns={[
              { key: "entity", label: "Data", render: (r) => <span className="font-mono text-xs">{str(r.entity ?? r.table ?? r.name, "—")}</span> },
              {
                key: "owner", label: "Canonical owner",
                render: (r) => ambiguous(r)
                  ? <span className="rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">AMBIGUOUS</span>
                  : <span>{str(r.owner ?? r.canonical_owner)}</span>,
              },
              { key: "readers", label: "Readers", render: (r) => <span className="text-xs">{list(r.readers).join(", ") || "—"}</span> },
              { key: "writers", label: "Writers", render: (r) => <span className="text-xs">{list(r.writers).join(", ") || "—"}</span> },
              { key: "derived_views", label: "Derived views", render: (r) => <span className="text-xs">{list(r.derived_views ?? r.views).join(", ") || "—"}</span> },
              { key: "indexes", label: "Indexes", render: (r) => <span className="text-xs">{list(r.indexes).join(", ") || "—"}</span> },
              { key: "caches", label: "Caches", render: (r) => <span className="text-xs">{list(r.caches).join(", ") || "—"}</span> },
              { key: "projections", label: "Projections", render: (r) => <span className="text-xs">{list(r.projections).join(", ") || "—"}</span> },
            ]}
          />
        </RegistryState>
      </Panel>
    </div>
  );
}
