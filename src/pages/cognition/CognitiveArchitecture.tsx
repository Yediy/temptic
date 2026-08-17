import { Link } from "react-router-dom";
import {
  ArchitectureLinks, CapabilityState, MetadataBlock, Panel, RecordTable,
} from "@/components/cognition/CogBits";
import { useCognitiveCapability, useCognitiveList } from "@/hooks/cognition/use-cognition";
import {
  ARCHITECTURE_VERSION, CAPABILITIES, CAPABILITY_SPEC, COGNITIVE_CONTROL_FUNCTION,
  PLATFORM_CONTRACT, PLATFORM_DNA, asRecord, str,
} from "@/lib/cognition/platform";

export default function CognitiveArchitecture() {
  const map = useCognitiveList("architecture.map");
  const meta = useCognitiveCapability<Record<string, unknown>>("architecture.map", { view: "summary" });
  const summary = asRecord(meta.data);

  return (
    <div className="space-y-4">
      <Panel title="Cognitive Architecture" description="How this workspace binds to the Architecture & Governance Console.">
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Platform Contract", PLATFORM_CONTRACT],
            ["Capability Specification", CAPABILITY_SPEC],
            ["Platform DNA", PLATFORM_DNA],
            ["Target Architecture", ARCHITECTURE_VERSION],
            ["Backend Organism", COGNITIVE_CONTROL_FUNCTION],
            ["Frontend Cognition", "None — observation and control only"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border bg-muted/20 p-2">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 border-t pt-3">
          <ArchitectureLinks />
        </div>
      </Panel>

      <Panel
        title="Faculty → Architecture Mapping"
        description="Served by the Cognitive Control API and resolvable in the Architecture Console."
      >
        <CapabilityState status={map.status} message={map.message} label="the cognitive architecture map">
          <RecordTable
            rows={map.rows}
            columns={[
              { key: "faculty", label: "Faculty", render: (r) => str(r.faculty ?? r.name, "—") },
              { key: "organism", label: "Platform Organism", render: (r) => (
                r.organism_id
                  ? <Link className="text-primary hover:underline" to={`/architecture/organisms/${str(r.organism_id)}`}>{str(r.organism ?? r.organism_id)}</Link>
                  : str(r.organism, "—")
              ) },
              { key: "contract", label: "Contract" },
              { key: "capspec", label: "CapSpec" },
              { key: "dna", label: "Platform DNA" },
              { key: "version", label: "Version" },
              { key: "health", label: "Health" },
            ]}
          />
          {summary.notes != null && <div className="mt-3"><MetadataBlock value={summary.notes} /></div>}
        </CapabilityState>
      </Panel>

      <Panel title="API Integration Matrix" description="Every capability this workspace consumes from Phase 6.0A.">
        <RecordTable
          rows={CAPABILITIES.map((c) => ({
            key: c.key, method: c.method, label: c.label, mutating: c.mutating ? "yes" : "no", roles: c.roles.join(", "),
          }))}
          rowKey="key"
          columns={[
            { key: "label", label: "Capability" },
            { key: "key", label: "Key", className: "font-mono text-xs" },
            { key: "method", label: "6.0A Method", className: "font-mono text-xs" },
            { key: "mutating", label: "Mutating" },
            { key: "roles", label: "Permitted Roles" },
          ]}
        />
      </Panel>
    </div>
  );
}
