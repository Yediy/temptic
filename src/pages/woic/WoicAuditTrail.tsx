import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AuditKind, AuditRow, filterAuditRows, fromDecision, fromRequest, fromTrace } from "@/lib/woic/audit-trail";

const LIMIT = 500;

function useAuditRows() {
  return useQuery({
    queryKey: ["woic-audit-trail"],
    queryFn: async (): Promise<AuditRow[]> => {
      const db = supabase as any;
      const [req, tr, dec, ev] = await Promise.all([
        db.from("woic_cognitive_requests").select("*").order("created_at", { ascending: false }).limit(LIMIT),
        db.from("woic_reasoning_traces").select("*").order("created_at", { ascending: false }).limit(LIMIT),
        db.from("woic_decisions").select("*").order("created_at", { ascending: false }).limit(LIMIT),
        db.from("woic_decision_evidence").select("*").limit(2000),
      ]);
      const err = req.error || tr.error || dec.error || ev.error;
      if (err) throw err;
      const evByDecision = new Map<string, unknown[]>();
      for (const e of ev.data ?? []) {
        const list = evByDecision.get(e.decision_id) ?? [];
        list.push({ kind: e.kind, ref: e.ref_entity ? `${e.ref_entity}:${e.ref_id}` : undefined, ...e.data });
        evByDecision.set(e.decision_id, list);
      }
      return [
        ...(req.data ?? []).map(fromRequest),
        ...(tr.data ?? []).map(fromTrace),
        ...(dec.data ?? []).map((d: any) => fromDecision(d, evByDecision.get(d.id) ?? [])),
      ];
    },
  });
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs font-mono bg-muted rounded p-2 whitespace-pre-wrap break-all max-h-72 overflow-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Section({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title} <span className="text-muted-foreground">({items.length})</span></h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None recorded.</p>
      ) : (
        items.map((it, i) => (
          <div key={i} className="border rounded p-2 text-sm">
            {typeof it === "string" ? it : <JsonBlock value={it} />}
          </div>
        ))
      )}
    </div>
  );
}

export default function WoicAuditTrail() {
  const { data = [], isLoading, error, refetch } = useAuditRows();
  const [org, setOrg] = useState("");
  const [corr, setCorr] = useState("");
  const [source, setSource] = useState("all");
  const [kind, setKind] = useState<AuditKind | "all">("all");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const sources = useMemo(() => Array.from(new Set(data.map((r) => r.source).filter(Boolean))).sort(), [data]);
  const rows = useMemo(
    () => filterAuditRows(data, { organizationId: org, correlationId: corr, source: source === "all" ? "" : source, kind }),
    [data, org, corr, source, kind],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Organization ID" value={org} onChange={(e) => setOrg(e.target.value)} className="font-mono text-xs" />
          <Input placeholder="Correlation ID" value={corr} onChange={(e) => setCorr(e.target.value)} className="font-mono text-xs" />
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue placeholder="Event source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as AuditKind | "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="request">Requests</SelectItem>
              <SelectItem value="trace">Reasoning traces</SelectItem>
              <SelectItem value="decision">Decisions</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setOrg(""); setCorr(""); setSource("all"); setKind("all"); }}>Clear</Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">Could not load audit trail: {(error as Error).message}</p>}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2 border-b text-xs text-muted-foreground">
            <span>{isLoading ? "Loading…" : `${rows.length} of ${data.length} records`}</span>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Time</th><th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Source</th><th className="text-left p-2">Summary</th>
                  <th className="text-left p-2">Organization</th><th className="text-left p-2">Correlation</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="p-2 whitespace-nowrap font-mono text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-2"><Badge variant="outline">{r.kind}</Badge></td>
                    <td className="p-2 font-mono text-xs">{r.source}</td>
                    <td className="p-2 max-w-xs truncate">{r.title}</td>
                    <td className="p-2 font-mono text-xs">{r.organizationId?.slice(0, 8) ?? "—"}</td>
                    <td className="p-2 font-mono text-xs">{r.correlationId.slice(0, 12)}</td>
                    <td className="p-2">{r.status ? <Badge variant="secondary">{r.status}</Badge> : "—"}</td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No WOIC records match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" aria-describedby={undefined}>
          {selected && (
            <>
              <SheetHeader><SheetTitle className="text-left">{selected.title}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-5">
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-muted-foreground">Type</dt><dd>{selected.kind}</dd>
                  <dt className="text-muted-foreground">Source</dt><dd className="font-mono">{selected.source}</dd>
                  <dt className="text-muted-foreground">Organization ID</dt><dd className="font-mono break-all">{selected.organizationId ?? "—"}</dd>
                  <dt className="text-muted-foreground">Correlation ID</dt><dd className="font-mono break-all">{selected.correlationId}</dd>
                  <dt className="text-muted-foreground">Record ID</dt><dd className="font-mono break-all">{selected.id}</dd>
                  <dt className="text-muted-foreground">Confidence</dt><dd>{selected.confidence != null ? `${Math.round(Number(selected.confidence) * (Number(selected.confidence) <= 1 ? 100 : 1))}%` : "—"}</dd>
                  <dt className="text-muted-foreground">Time</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd>
                </dl>
                <Section title="Evidence" items={selected.evidence} />
                <Section title="Alternatives considered" items={selected.alternatives} />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Risk assessment</h3>
                  {selected.risk ? <JsonBlock value={selected.risk} /> : <p className="text-xs text-muted-foreground">None recorded.</p>}
                </div>
                <details>
                  <summary className="text-sm font-semibold cursor-pointer">Full record</summary>
                  <JsonBlock value={selected.raw} />
                </details>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
