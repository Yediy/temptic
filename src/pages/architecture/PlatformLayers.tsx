import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function PlatformLayers() {
  const layers = useRegistryList("layers.list");
  const { filtered, input } = useRowSearch(layers.rows);

  return (
    <Panel title="Platform Layers" description="Architectural layers declared by the registry." actions={input}>
      <RegistryState status={layers.status} message={layers.message} label="platform layers">
        <RecordTable
          rows={filtered}
          empty="The registry declares no platform layers."
          columns={[
            { key: "name", label: "Layer", render: (r) => <span className="font-medium">{str(r.name ?? r.id, "—")}</span> },
            { key: "purpose", label: "Purpose" },
            { key: "organisms", label: "Organisms", render: (r) => <span>{list(r.organisms).length || "—"}</span> },
            { key: "rules", label: "Layering rules", render: (r) => <span className="text-xs">{list(r.rules).join(", ") || "—"}</span> },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
