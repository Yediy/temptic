import { EngineeringAssistant, Panel, RecordTable, RegistryState, StabilityBadge, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { str } from "@/lib/architecture/platform";

export default function PlatformOrganisms() {
  const organisms = useRegistryList("organisms.list");
  const { filtered, input } = useRowSearch(organisms.rows);

  return (
    <div className="space-y-3">
      <Panel
        title="Platform Organisms"
        description="Every organism registered in the canonical Architecture Registry."
        actions={input}
      >
        <RegistryState status={organisms.status} message={organisms.message} label="the organism registry">
          <RecordTable
            rows={filtered}
            empty="The registry contains no Platform Organisms for this scope."
            linkTo={(row) => (row.id ? `/architecture/organisms/${encodeURIComponent(str(row.id))}` : null)}
            columns={[
              { key: "name", label: "Organism", render: (r) => <span className="font-medium">{str(r.name ?? r.id, "—")}</span> },
              { key: "layer", label: "Layer" },
              { key: "domain", label: "Domain" },
              { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs">{str(r.version, "—")}</span> },
              { key: "platform_contract", label: "Contract", render: (r) => <span className="font-mono text-xs">{str(r.platform_contract ?? r.contract, "—")}</span> },
              { key: "stability", label: "Stability", render: (r) => <StabilityBadge value={r.stability} /> },
              { key: "health", label: "Health" },
            ]}
          />
        </RegistryState>
      </Panel>

      <EngineeringAssistant context={{ organisms: filtered.slice(0, 60) }} />
    </div>
  );
}
