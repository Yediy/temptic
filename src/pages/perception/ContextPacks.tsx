import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, FreshnessBadge, PrivacyNotice, ScoreMeter, UnresolvedFlag } from "@/components/perception/PerceptionBits";
import { usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { useContextPacks } from "@/hooks/perception/use-context-packs";
import { COVERAGE_FACETS, type ContextPack, type EvidenceItem } from "@/lib/perception/context-pack";
import { formatTime } from "@/lib/perception/platform";

const TABS = ["request", "evidence", "references", "coverage", "freshness", "missing", "contradictions"] as const;
type Tab = (typeof TABS)[number];

function EvidenceRow({ e, onOpen }: { e: EvidenceItem; onOpen: (e: EvidenceItem) => void }) {
  return (
    <button type="button" onClick={() => onOpen(e)} className="flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs hover:bg-accent/40">
      <span className="space-y-0.5">
        <span className="block font-medium">{e.claim}</span>
        <span className="block text-muted-foreground">{e.source}{e.ref ? ` · ${e.ref.slice(0, 8)}` : ""}{e.observedAt ? ` · ${formatTime(e.observedAt)}` : ""}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="text-[10px]">{e.stance}</Badge>
        <FreshnessBadge value={e.freshness} />
      </span>
    </button>
  );
}

function Inspector({ pack, tab, setTab, onClose }: { pack: ContextPack; tab: Tab; setTab: (t: Tab) => void; onClose: () => void }) {
  const [ev, setEv] = useState<EvidenceItem | null>(null);
  const counts: Record<Tab, number | null> = {
    request: null, evidence: pack.evidence.length, references: pack.references.length, coverage: null,
    freshness: null, missing: pack.missing.length, contradictions: pack.contradictions.length,
  };
  return (
    <Panel title="Context Pack Inspector" description={pack.objective || pack.id}
      actions={<Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>}>
      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setEv(null); }}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === "request" ? "Cognitive request" : t === "missing" ? "Missing info" : t}
              {counts[t] !== null && <span className="ml-1 text-[10px] text-muted-foreground">({counts[t]})</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="request" className="space-y-3">
          <div className="grid gap-2 text-xs sm:grid-cols-4">
            <div><p className="text-muted-foreground">Operation</p><p className="font-mono">{String(pack.request.service)}.{String(pack.request.operation)}</p></div>
            <div><p className="text-muted-foreground">Status</p><p className="font-mono">{String(pack.request.status ?? "—")}</p></div>
            <div><p className="text-muted-foreground">Latency</p><p className="font-mono">{pack.request.latency_ms ? `${pack.request.latency_ms} ms` : "—"}</p></div>
            <div><p className="text-muted-foreground">Created</p><p className="font-mono">{formatTime(pack.createdAt)}</p></div>
          </div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Input</p>
          <MetadataBlock value={pack.request.input} />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Output</p>
          <MetadataBlock value={pack.request.output} />
        </TabsContent>

        <TabsContent value="evidence" className="space-y-2">
          {pack.evidence.length === 0 && <p className="text-sm text-muted-foreground">No evidence was recorded for this request.</p>}
          {pack.evidence.map((e) => <EvidenceRow key={e.id} e={e} onOpen={setEv} />)}
          {ev && <div className="rounded-md border p-3"><p className="mb-1 text-[11px] uppercase text-muted-foreground">Evidence detail</p><MetadataBlock value={ev.raw} /></div>}
        </TabsContent>

        <TabsContent value="references">
          <RecordTable rows={pack.references as unknown as Record<string, unknown>[]} columns={[
            { key: "kind", label: "Type" }, { key: "id", label: "ID" }, { key: "via", label: "Linked via" },
          ]} />
        </TabsContent>

        <TabsContent value="coverage" className="space-y-3">
          <ScoreMeter value={pack.coverage.score} label="Coverage" />
          <div className="grid gap-1 sm:grid-cols-3">
            {COVERAGE_FACETS.map((f) => (
              <div key={f} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs capitalize">
                {f}
                <Badge variant={pack.coverage.present.includes(f) ? "outline" : "destructive"} className="text-[10px]">
                  {pack.coverage.present.includes(f) ? "present" : "absent"}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="freshness" className="space-y-3">
          <div className="flex items-center gap-2 text-sm">Overall (worst evidence): <FreshnessBadge value={pack.freshness.overall} /></div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(pack.freshness.counts).map(([k, n]) => <Badge key={k} variant="outline">{k}: {n}</Badge>)}
          </div>
          {pack.evidence.map((e) => <EvidenceRow key={e.id} e={e} onOpen={(x) => { setTab("evidence"); setEv(x); }} />)}
        </TabsContent>

        <TabsContent value="missing" className="space-y-1">
          {pack.missing.length === 0 && <p className="text-sm text-muted-foreground">No gaps detected.</p>}
          {pack.missing.map((m, i) => <div key={i} className="rounded-md border px-3 py-2 text-xs"><UnresolvedFlag>{m}</UnresolvedFlag></div>)}
        </TabsContent>

        <TabsContent value="contradictions" className="space-y-2">
          {pack.contradictions.length === 0 && <p className="text-sm text-muted-foreground">No conflicting evidence found.</p>}
          {pack.contradictions.map((c, i) => (
            <div key={i} className="space-y-1 rounded-md border p-2">
              <p className="text-[11px] uppercase text-muted-foreground">On {c.topic}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <EvidenceRow e={c.a} onOpen={(x) => { setTab("evidence"); setEv(x); }} />
                <EvidenceRow e={c.b} onOpen={(x) => { setTab("evidence"); setEv(x); }} />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </Panel>
  );
}

export default function ContextPacks() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("request");
  const q = useContextPacks();
  const rows = useMemo(() => (q.data ?? []).map((p) => ({
    id: p.id, objective: p.objective, operation: String(p.request.operation ?? ""), created_at: p.createdAt,
    coverage: p.coverage.score, freshness: p.freshness.overall, evidence: p.evidence.length,
    missing: p.missing.length, contradictions: p.contradictions.length,
  })), [q.data]);
  const filtered = useRowFilter(rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const pack = q.data?.find((p) => p.id === openId) ?? null;
  const open = (id: string, t: Tab) => { setOpenId(id); setTab(t); };
  const cell = (id: string, t: Tab, node: React.ReactNode) => (
    <button type="button" className="text-left hover:underline" onClick={() => open(id, t)}>{node}</button>
  );

  return (
    <div className="space-y-4">
      <Panel title="Context Packs" description="Context assembled for each WOIC cognitive request. Click any cell to drill into that section.">
        <CapabilityState status={q.isLoading ? "loading" : q.error ? "error" : "ok"} message={q.error?.message ?? null} label="context packs">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter context packs…" />
          <RecordTable rows={paged} columns={[
            { key: "objective", label: "Cognitive Request", render: (r) => cell(String(r.id), "request", <span className="text-primary">{String(r.objective || r.operation || r.id)}</span>) },
            { key: "evidence", label: "Evidence", render: (r) => cell(String(r.id), "evidence", String(r.evidence)) },
            { key: "coverage", label: "Coverage", render: (r) => cell(String(r.id), "coverage", <ScoreMeter value={r.coverage} label="Coverage" />) },
            { key: "freshness", label: "Freshness", render: (r) => cell(String(r.id), "freshness", <FreshnessBadge value={r.freshness} />) },
            { key: "missing", label: "Missing", render: (r) => cell(String(r.id), "missing", Number(r.missing) ? <UnresolvedFlag>{String(r.missing)} gaps</UnresolvedFlag> : "—") },
            { key: "contradictions", label: "Contradictions", render: (r) => cell(String(r.id), "contradictions", Number(r.contradictions) ? <UnresolvedFlag>{String(r.contradictions)}</UnresolvedFlag> : "—") },
            { key: "created_at", label: "Created", render: (r) => formatTime(r.created_at) },
          ]} />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>
      {pack && <Inspector pack={pack} tab={tab} setTab={setTab} onClose={() => setOpenId(null)} />}
      <PrivacyNotice />
    </div>
  );
}
