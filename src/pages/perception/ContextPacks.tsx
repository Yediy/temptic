import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  CapabilityState, CompositionFlow, FreshnessBadge, PrivacyNotice, ScoreMeter, UnresolvedFlag,
} from "@/components/perception/PerceptionBits";
import {
  usePerceptionCapability, usePerceptionList, usePerceptionSettings, useRowFilter,
} from "@/hooks/perception/use-perception";
import { CONTEXT_PACK_SECTIONS, asArray, asRecord, formatTime, str } from "@/lib/perception/platform";

export default function ContextPacks() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null);

  const list = usePerceptionList("context.packs.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = usePerceptionCapability<Record<string, unknown>>(
    "context.packs.get", { pack_id: openId }, { enabled: !!openId },
  );
  const composition = usePerceptionCapability<Record<string, unknown>>(
    "context.composition", { pack_id: openId }, { enabled: !!openId },
  );
  const pack = asRecord(detail.data);
  const inputs = asArray(asRecord(composition.data).inputs ?? composition.data);
  const drillRecord = inputs.find((i) => str(i.source ?? i.name ?? i.key).toLowerCase() === (drill ?? "").toLowerCase());

  return (
    <div className="space-y-4">
      <Panel title="Context Packs" description="Context assembled by WOIC for each cognitive request.">
        <CapabilityState status={list.status} message={list.message} label="context packs">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter context packs…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "cognitive_request", label: "Cognitive Request", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => { setOpenId(str(r.id)); setDrill(null); }}>
                  {str(r.cognitive_request ?? r.objective ?? r.id, "(unnamed pack)")}
                </button>
              ) },
              { key: "primary_entities", label: "Primary Entities", render: (r) => str(r.primary_entities, "—") },
              { key: "coverage", label: "Coverage", render: (r) => <ScoreMeter value={r.coverage} label="Coverage" /> },
              { key: "freshness", label: "Freshness", render: (r) => <FreshnessBadge value={r.freshness} /> },
              { key: "missing_information", label: "Missing", render: (r) => {
                const n = asArray(r.missing_information).length;
                return n ? <UnresolvedFlag>{n} gap{n === 1 ? "" : "s"}</UnresolvedFlag> : str(r.missing_information, "—");
              } },
              { key: "contradictions", label: "Contradictions", render: (r) => {
                const n = asArray(r.contradictions).length;
                return n ? <UnresolvedFlag>{n} unresolved</UnresolvedFlag> : str(r.contradictions, "—");
              } },
              { key: "estimated_context_size", label: "Size" },
              { key: "expiration", label: "Expires", render: (r) => formatTime(r.expiration) },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {openId && (
        <>
          <Panel
            title="Context Composition"
            description="How this pack was assembled from platform sources. Structure only — not hidden reasoning."
            actions={<Button type="button" size="sm" variant="ghost" onClick={() => setOpenId(null)}>Close</Button>}
          >
            <CapabilityState status={composition.status} message={composition.message} label="context composition">
              <CompositionFlow inputs={inputs} selected={drill} onSelect={(k) => setDrill(drill === k ? null : k)} />
              {drill && (
                <div className="mt-3 rounded-md border p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{drill} contribution</p>
                  {drillRecord
                    ? <MetadataBlock value={drillRecord} />
                    : <p className="text-sm text-muted-foreground">This source did not contribute to the pack, or 6.1A reported nothing for it.</p>}
                </div>
              )}
            </CapabilityState>
          </Panel>

          <Panel title="Context Pack Inspector" description="Every field reported by the Perception & Context API.">
            <CapabilityState status={detail.status} message={detail.message} label="this context pack">
              <div className="grid gap-3 lg:grid-cols-2">
                {CONTEXT_PACK_SECTIONS.map((s) => (
                  <div key={s.key}>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    {s.key === "coverage"
                      ? <ScoreMeter value={pack.coverage} label="Coverage" />
                      : s.key === "freshness"
                        ? <FreshnessBadge value={pack.freshness} />
                        : <MetadataBlock value={pack[s.key]} />}
                  </div>
                ))}
              </div>
            </CapabilityState>
          </Panel>
        </>
      )}

      <PrivacyNotice />
    </div>
  );
}
