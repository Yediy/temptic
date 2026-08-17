import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { str } from "@/lib/architecture/platform";

export default function CompatibilityMatrix() {
  const matrix = useRegistryList("compatibility.matrix");
  const { filtered, input } = useRowSearch(matrix.rows);

  return (
    <Panel title="Compatibility Matrix" description="Declared compatibility between versioned components." actions={input}>
      <RegistryState status={matrix.status} message={matrix.message} label="the compatibility matrix">
        <RecordTable
          rows={filtered}
          empty="The registry contains no compatibility declarations."
          columns={[
            { key: "component", label: "Component", render: (r) => <span className="font-mono text-xs font-semibold">{str(r.component ?? r.source, "—")}</span> },
            { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs">{str(r.version, "—")}</span> },
            { key: "compatible_with", label: "Compatible with", render: (r) => <span className="font-mono text-xs">{str(r.compatible_with ?? r.target, "—")}</span> },
            { key: "target_version", label: "Target version", render: (r) => <span className="font-mono text-xs">{str(r.target_version, "—")}</span> },
            { key: "status", label: "Status" },
            { key: "notes", label: "Notes" },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
