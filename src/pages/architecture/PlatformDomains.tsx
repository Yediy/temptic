import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function PlatformDomains() {
  const domains = useRegistryList("domains.list");
  const { filtered, input } = useRowSearch(domains.rows);

  return (
    <Panel title="Platform Domains" description="Domains, owners and the organisms assigned to them." actions={input}>
      <RegistryState status={domains.status} message={domains.message} label="platform domains">
        <RecordTable
          rows={filtered}
          empty="The registry declares no platform domains."
          columns={[
            { key: "name", label: "Domain", render: (r) => <span className="font-medium">{str(r.name ?? r.id, "—")}</span> },
            { key: "owner", label: "Owner" },
            { key: "purpose", label: "Purpose" },
            { key: "organisms", label: "Organisms", render: (r) => <span>{list(r.organisms).length || "—"}</span> },
            { key: "apis", label: "APIs", render: (r) => <span>{list(r.apis).length || "—"}</span> },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
