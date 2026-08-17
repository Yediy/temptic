import { EngineeringAssistant, Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function EventCatalog() {
  const events = useRegistryList("events.catalog");
  const { filtered, input } = useRowSearch(events.rows);

  return (
    <div className="space-y-3">
      <Panel title="Event Catalog" description="Registered platform events with publishers and consumers." actions={input}>
        <RegistryState status={events.status} message={events.message} label="the event catalog">
          <RecordTable
            rows={filtered}
            empty="The registry contains no events."
            columns={[
              { key: "name", label: "Event", render: (r) => <span className="font-mono text-xs font-semibold">{str(r.name ?? r.event, "—")}</span> },
              { key: "publisher", label: "Publisher" },
              { key: "consumers", label: "Consumers", render: (r) => <span className="text-xs">{list(r.consumers).join(", ") || "—"}</span> },
              { key: "version", label: "Version", render: (r) => <span className="font-mono text-xs">{str(r.version, "—")}</span> },
              { key: "payload", label: "Payload", render: (r) => <span className="font-mono text-[11px]">{typeof r.payload === "object" && r.payload ? Object.keys(r.payload as object).join(", ") : str(r.payload, "—")}</span> },
              { key: "replay_safety", label: "Replay safe", render: (r) => <span className="text-xs">{str(r.replay_safety ?? r.replay_safe, "—")}</span> },
              { key: "retention", label: "Retention" },
              { key: "tenant_scope", label: "Tenant scope", render: (r) => <span className="text-xs">{str(r.tenant_scope, "—")}</span> },
              { key: "idempotency", label: "Idempotency", render: (r) => <span className="text-xs">{str(r.idempotency, "—")}</span> },
              { key: "correlation", label: "Correlation", render: (r) => <span className="text-xs">{str(r.correlation, "—")}</span> },
            ]}
          />
        </RegistryState>
      </Panel>

      <EngineeringAssistant context={{ events: filtered.slice(0, 80) }} tasks={["locate", "affected_components"]} />
    </div>
  );
}
