import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readComplianceScreening, OPEN_COMPLIANCE_STATUSES, REPORT_PAGE_SIZE } from "@/lib/screening/compliance-report";

const date = (s: string | null) => s ? new Date(s).toLocaleString() : "—";
const short = (s: string | null) => s ? s.slice(0, 8) : "—";

function Pager({ page, setPage, more }: { page: number; setPage: (page: number) => void; more: boolean }) {
  return <div className="flex items-center justify-end gap-3 pt-3"><Button aria-label="Previous page" size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm text-muted-foreground">Page {page + 1}</span><Button aria-label="Next page" size="icon" variant="outline" disabled={!more} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div>;
}
function State({ loading, error, empty }: { loading: boolean; error: unknown; empty: boolean }) {
  if (loading) return <p className="py-8 text-sm text-muted-foreground" role="status">Loading…</p>;
  if (error) return <p className="py-6 text-sm text-destructive" role="alert">Could not load this section. {error instanceof Error ? error.message : "Please try again."}</p>;
  return empty ? <p className="py-8 text-sm text-muted-foreground">No records found.</p> : null;
}

export default function ComplianceReport() {
  const { agencyId, roles } = useAuth();
  const [recordPage, setRecordPage] = useState(0);
  const [trailPage, setTrailPage] = useState(0);
  const [findingPage, setFindingPage] = useState(0);
  const isSuper = roles.includes("super_admin");
  const records = useQuery({ queryKey: ["compliance-screening", agencyId, recordPage], enabled: !!agencyId, staleTime: 0, refetchOnWindowFocus: false, queryFn: () => {
    if (!agencyId) throw new Error("Select an agency.");
    return readComplianceScreening(agencyId, recordPage);
  } });
  const trail = useQuery({ queryKey: ["compliance-trail", agencyId, trailPage], enabled: !!agencyId, queryFn: async () => {
    if (!agencyId) throw new Error("Select an agency.");
    const { data, error } = await supabase.from("screening_access_log").select("id,created_at,action,record_type,record_id,document_version,actor_user_id,actor_roles,worker_id").eq("agency_id", agencyId).order("created_at", { ascending: false }).order("id").range(trailPage * REPORT_PAGE_SIZE, (trailPage + 1) * REPORT_PAGE_SIZE - 1);
    if (error) throw error;
    return data ?? [];
  } });
  const findings = useQuery({ queryKey: ["compliance-open-findings", agencyId, findingPage], enabled: !!agencyId, queryFn: async () => {
    if (!agencyId) throw new Error("Select an agency.");
    const { data, error } = await supabase.from("woic_compliance_events").select("id,status,identity_id,next_action_at,expires_at,woic_compliance_rules(name,code)").eq("agency_id", agencyId).in("status", OPEN_COMPLIANCE_STATUSES).order("created_at", { ascending: false }).order("id").range(findingPage * REPORT_PAGE_SIZE, (findingPage + 1) * REPORT_PAGE_SIZE - 1);
    if (error) throw error;
    return data ?? [];
  } });
  const security = useQuery({ queryKey: ["compliance-open-security"], enabled: isSuper, queryFn: async () => {
    const { data, error } = await supabase.from("security_findings").select("internal_id,name,level,status").eq("status", "remaining").order("last_seen_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  } });
  const busy = records.isFetching || trail.isFetching || findings.isFetching || security.isFetching;
  const refresh = async () => { if (agencyId) { await records.refetch(); await Promise.all([trail.refetch(), findings.refetch()]); } if (isSuper) await security.refetch(); };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6" />Compliance report</h1><div className="flex gap-2"><Button asChild variant="outline"><Link to="/screening/access-log"><History className="mr-2 h-4 w-4" />Access trail</Link></Button><Button variant="outline" size="icon" aria-label="Refresh report" title="Refresh report" disabled={busy} onClick={refresh}><RefreshCw className="h-4 w-4" /></Button></div></div>
    {!agencyId && <p role="status" className="text-sm text-muted-foreground">No active agency selected. Agency screening records and findings are unavailable.</p>}
    <Tabs defaultValue="records"><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="records">Screening records</TabsTrigger><TabsTrigger value="trail">Access trail</TabsTrigger><TabsTrigger value="findings">Open findings</TabsTrigger></TabsList>
      <TabsContent value="records" className="space-y-3"><h2 className="text-lg font-semibold">Screening records</h2><State loading={records.isLoading && !!agencyId} error={records.error} empty={!!agencyId && !records.data?.length} />
        {!!records.data?.length && <Table><TableHeader><TableRow>{["Record", "Worker", "Status", "Provider", "Version", "Recorded", ""].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{records.data.map(r => <TableRow key={`${r.type}-${r.id}`}><TableCell className="font-mono text-xs" title={r.id}>{r.type} · {short(r.id)}</TableCell><TableCell className="font-mono text-xs" title={r.worker}>{short(r.worker)}</TableCell><TableCell><Badge variant="secondary">{r.status}</Badge></TableCell><TableCell>{r.provider ?? "—"}{r.provider === "mock" && <Badge variant="outline" className="ml-2">Mock</Badge>}</TableCell><TableCell>{r.version == null ? "—" : `v${r.version}`}</TableCell><TableCell className="whitespace-nowrap">{date(r.date)}</TableCell><TableCell>{r.type !== "order" && <Button asChild variant="outline" size="sm"><Link to={`/screening/${r.type}/${r.id}`}>Open</Link></Button>}</TableCell></TableRow>)}</TableBody></Table>}
        <Pager page={recordPage} setPage={setRecordPage} more={["order", "report", "consent"].some(t => (records.data ?? []).filter(r => r.type === t).length === REPORT_PAGE_SIZE)} />
      </TabsContent>
      <TabsContent value="trail" className="space-y-3"><h2 className="text-lg font-semibold">Access trail</h2><State loading={trail.isLoading && !!agencyId} error={trail.error} empty={!!agencyId && !trail.data?.length} />
        {!!trail.data?.length && <Table><TableHeader><TableRow>{["When", "Action", "Record", "Version", "Actor", "Roles"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{trail.data.map(r => <TableRow key={r.id}><TableCell className="whitespace-nowrap">{date(r.created_at)}</TableCell><TableCell><Badge variant="secondary">{r.action}</Badge></TableCell><TableCell className="font-mono text-xs" title={r.record_id}>{r.record_type} · {short(r.record_id)}</TableCell><TableCell>{r.document_version == null ? "—" : `v${r.document_version}`}</TableCell><TableCell title={r.actor_user_id ?? undefined}>{short(r.actor_user_id)}</TableCell><TableCell>{r.actor_roles?.join(", ") || "—"}</TableCell></TableRow>)}</TableBody></Table>}
        <Pager page={trailPage} setPage={setTrailPage} more={trail.data?.length === REPORT_PAGE_SIZE} />
      </TabsContent>
      <TabsContent value="findings" className="space-y-4"><h2 className="text-lg font-semibold">Open agency findings</h2><State loading={findings.isLoading && !!agencyId} error={findings.error} empty={!!agencyId && !findings.data?.length} />
        {!!findings.data?.length && <Table><TableHeader><TableRow>{["Finding", "Status", "Identity", "Next action", "Expires"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{findings.data.map(r => <TableRow key={r.id}><TableCell>{r.woic_compliance_rules?.name ?? short(r.id)}</TableCell><TableCell><Badge variant={r.status === "expired" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell><TableCell title={r.identity_id ?? undefined}>{short(r.identity_id)}</TableCell><TableCell>{date(r.next_action_at)}</TableCell><TableCell>{date(r.expires_at)}</TableCell></TableRow>)}</TableBody></Table>}
        <Pager page={findingPage} setPage={setFindingPage} more={findings.data?.length === REPORT_PAGE_SIZE} />
        <div className="border-t pt-4"><h2 className="text-lg font-semibold">Open platform security findings</h2>{!isSuper ? <p className="py-3 text-sm text-muted-foreground">Platform security findings are restricted to super administrators.</p> : <><State loading={security.isLoading} error={security.error} empty={!security.data?.length} />{security.data?.map(r => <div key={r.internal_id} className="flex items-start justify-between gap-3 border-b py-3"><span className="min-w-0 break-words text-sm">{r.name}</span><Badge variant={r.level === "error" ? "destructive" : "secondary"}>{r.level}</Badge></div>)}<Button asChild variant="link" className="px-0"><Link to="/admin/security">All platform security findings</Link></Button></>}</div>
      </TabsContent>
    </Tabs>
  </div>;
}