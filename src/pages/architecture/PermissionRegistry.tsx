import { Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function PermissionRegistry() {
  const perms = useRegistryList("permissions.registry");
  const { filtered, input } = useRowSearch(perms.rows);

  return (
    <Panel title="Permission Registry" description="Permissions, roles, ABAC conditions and the organisms they govern." actions={input}>
      <RegistryState status={perms.status} message={perms.message} label="the permission registry">
        <RecordTable
          rows={filtered}
          empty="The registry contains no permissions."
          columns={[
            { key: "permission", label: "Permission", render: (r) => <span className="font-mono text-xs font-semibold">{str(r.permission ?? r.name, "—")}</span> },
            { key: "roles", label: "Roles", render: (r) => <span className="text-xs">{list(r.roles).join(", ") || "—"}</span> },
            { key: "abac_conditions", label: "ABAC conditions", render: (r) => <span className="text-xs">{list(r.abac_conditions ?? r.conditions).join("; ") || "—"}</span> },
            {
              key: "sensitive", label: "Sensitive",
              render: (r) => r.sensitive
                ? <span className="rounded border border-red-500/60 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">SENSITIVE</span>
                : <span className="text-xs text-muted-foreground">—</span>,
            },
            { key: "organisms", label: "Affected organisms", render: (r) => <span className="text-xs">{list(r.organisms ?? r.affected_organisms).join(", ") || "—"}</span> },
            {
              key: "emergency", label: "Emergency",
              render: (r) => r.emergency
                ? <span className="rounded border border-orange-500/60 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">EMERGENCY</span>
                : <span className="text-xs text-muted-foreground">—</span>,
            },
            { key: "autonomy_authority", label: "Autonomy authority", render: (r) => <span className="text-xs">{str(r.autonomy_authority, "—")}</span> },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
