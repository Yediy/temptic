import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useArchPermissions, useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function IpRegister() {
  const { canViewIp } = useArchPermissions();
  const ip = useRegistryList("ip.register", {}, { enabled: canViewIp });
  const { filtered, input } = useRowSearch(ip.rows);

  if (!canViewIp) {
    return (
      <Panel title="IP Register" description="Intellectual property review entries.">
        <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
          <p className="font-semibold text-red-400">NOT AUTHORIZED</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The IP Register is restricted to platform super administrators.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="IP Register" description="Intellectual property review status for platform organisms." actions={input}>
      <RegistryState status={ip.status} message={ip.message} label="the IP register">
        <RecordTable
          rows={filtered}
          empty="The registry contains no IP entries."
          columns={[
            { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{str(r.subject ?? r.organism, "—")}</span> },
            { key: "ip_status", label: "IP status", render: (r) => <span className="text-xs uppercase">{str(r.ip_status ?? r.status, "—")}</span> },
            { key: "novelty", label: "Novelty" },
            { key: "claims", label: "Claims", render: (r) => <span className="text-xs">{list(r.claims).join("; ") || "—"}</span> },
            { key: "reviewer", label: "Reviewer" },
            { key: "reviewed_at", label: "Reviewed", render: (r) => <span className="text-xs">{str(r.reviewed_at, "—")}</span> },
            { key: "notes", label: "Notes" },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
