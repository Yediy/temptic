import { useState } from "react";
import { EngineeringAssistant, KeyValue, Panel, RecordTable, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function AdrsPage() {
  const adrs = useRegistryList("adrs.list");
  const { filtered, input } = useRowSearch(adrs.rows);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = filtered.find((r) => str(r.id ?? r.code) === openId) ?? null;

  return (
    <div className="space-y-3">
      <Panel title="Architecture Decision Records" description="Decisions recorded in the canonical registry." actions={input}>
        <RegistryState status={adrs.status} message={adrs.message} label="architecture decision records">
          <RecordTable
            rows={filtered}
            empty="The registry contains no ADRs."
            columns={[
              {
                key: "code", label: "ADR",
                render: (r) => (
                  <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline"
                    onClick={() => setOpenId(str(r.id ?? r.code))}>
                    {str(r.code ?? r.id, "—")}
                  </button>
                ),
              },
              { key: "title", label: "Title" },
              { key: "status", label: "Status" },
              { key: "decided_at", label: "Decided", render: (r) => <span className="text-xs">{str(r.decided_at ?? r.created_at, "—")}</span> },
              { key: "organisms", label: "Organisms", render: (r) => <span className="text-xs">{list(r.organisms).join(", ") || "—"}</span> },
              { key: "supersedes", label: "Supersedes", render: (r) => <span className="font-mono text-xs">{str(r.supersedes, "—")}</span> },
            ]}
          />
        </RegistryState>
      </Panel>

      {open && (
        <Panel title={str(open.code ?? open.id, "ADR")} description={str(open.title)}>
          <KeyValue record={open} />
        </Panel>
      )}

      <EngineeringAssistant context={{ adrs: filtered.slice(0, 40), open }} tasks={["find_adrs", "architecture_history"]} />
    </div>
  );
}
