import { EngineeringAssistant, Panel, RecordTable, RegistryState, StabilityBadge, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function ApiCatalog() {
  const apis = useRegistryList("apis.catalog");
  const { filtered, input } = useRowSearch(apis.rows);

  return (
    <div className="space-y-3">
      <Panel title="API Catalog" description="Every API registered against a Platform Organism." actions={input}>
        <RegistryState status={apis.status} message={apis.message} label="the API catalog">
          <RecordTable
            rows={filtered}
            empty="The registry contains no APIs."
            columns={[
              { key: "method", label: "Method", render: (r) => <span className="font-mono text-xs font-semibold">{str(r.method, "—")}</span> },
              { key: "route", label: "Route", render: (r) => <span className="font-mono text-xs">{str(r.route ?? r.path, "—")}</span> },
              { key: "owner", label: "Owner" },
              { key: "purpose", label: "Purpose" },
              { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs">{str(r.version, "—")}</span> },
              { key: "authentication", label: "Auth", render: (r) => <span className="text-xs">{str(r.authentication ?? r.auth, "—")}</span> },
              { key: "permission", label: "Permission", render: (r) => <span className="font-mono text-xs">{str(r.permission, "—")}</span> },
              { key: "consumers", label: "Consumers", render: (r) => <span className="text-xs">{list(r.consumers).join(", ") || "—"}</span> },
              { key: "events", label: "Events", render: (r) => <span className="text-xs">{list(r.events).join(", ") || "—"}</span> },
              { key: "stability", label: "Stability", render: (r) => <StabilityBadge value={r.stability} /> },
              { key: "deprecation", label: "Deprecation", render: (r) => <span className="text-xs">{str(r.deprecation, "—")}</span> },
            ]}
          />
        </RegistryState>
      </Panel>

      <EngineeringAssistant context={{ apis: filtered.slice(0, 80) }} tasks={["locate", "affected_components"]} />
    </div>
  );
}
