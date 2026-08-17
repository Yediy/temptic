import { useState } from "react";
import {
  ArchitectureLinks, CapabilityState, FacultyStatusBadge, ListControls, MetadataBlock,
  Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { asRecord, formatCost, formatLatency, isOperationalFaculty, normalizeFacultyStatus, str } from "@/lib/cognition/platform";

export default function FacultyRegistry() {
  const [settings, setSettings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const list = useCognitiveList("faculties.list", {}, { refetchInterval: settings.refreshMs });

  const visible = settings.showPlannedFaculties
    ? list.rows
    : list.rows.filter((r) => normalizeFacultyStatus(r.status) !== "PLANNED");
  const filtered = useRowFilter(visible, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel
        title="Faculty Registry"
        description="Registered cognitive faculties. PLANNED faculties are declared, not operational."
      >
        <CapabilityState status={list.status} message={list.message} label="the faculty registry">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter faculties…">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={settings.showPlannedFaculties}
                onChange={(e) => setSettings({ ...settings, showPlannedFaculties: e.target.checked })}
              />
              Show PLANNED
            </label>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "name", label: "Faculty", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.name ?? r.faculty ?? r.id, "—")}
                </button>
              ) },
              { key: "purpose", label: "Purpose" },
              { key: "status", label: "Status", render: (r) => <FacultyStatusBadge status={r.status} /> },
              { key: "version", label: "Version" },
              { key: "capabilities", label: "Capabilities", render: (r) => (
                isOperationalFaculty(r.status)
                  ? str(r.capabilities, "—")
                  : <span className="text-muted-foreground">declared only</span>
              ) },
              { key: "latency", label: "Latency", render: (r) => formatLatency(r.latency_ms ?? r.latency) },
              { key: "cost", label: "Cost", render: (r) => formatCost(r.cost_per_call ?? r.cost) },
              { key: "health", label: "Health" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title={`Faculty — ${str(detail.name ?? detail.faculty, "detail")}`} description="Dependencies, permissions, domains and model requirements.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Purpose", detail.purpose],
              ["Capabilities", detail.capabilities],
              ["Status", detail.status],
              ["Version", detail.version],
              ["Dependencies", detail.dependencies],
              ["Permissions", detail.permissions],
              ["Domains", detail.domains],
              ["Model Requirements", detail.model_requirements],
              ["Cost Characteristics", detail.cost_characteristics],
              ["Health", detail.health],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                <MetadataBlock value={value} />
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <ArchitectureLinks faculty={str(detail.name ?? detail.faculty, "Faculty")} />
          </div>
        </Panel>
      )}
    </div>
  );
}
