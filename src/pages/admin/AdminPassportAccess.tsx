import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound } from "lucide-react";
import {
  TOKEN_STATUS_LABEL, filterAccessLog, summarizeAccessLog, tokenStatusOf,
  type AccessLogFilters, type AccessLogRow, type TokenStatus,
} from "@/lib/passport/access-log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
const LIMIT = 5000;
const statusVariant = (s: TokenStatus): "destructive" | "default" | "secondary" | "outline" =>
  s.startsWith("denied") ? "destructive" : s === "accessed" ? "default" : s === "revoked" ? "secondary" : "outline";

function TopList({ title, items }: { title: string; items: { key: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-xs">
        {items.length === 0 && <p className="text-muted-foreground">None</p>}
        {items.map((i) => (
          <div key={i.key} className="flex justify-between gap-2"><span className="truncate font-mono" title={i.key}>{i.key}</span><span>{i.count}</span></div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminPassportAccess() {
  const [f, setF] = useState<AccessLogFilters>({ status: "" });
  const [page, setPage] = useState(0);
  const set = (p: Partial<AccessLogFilters>) => { setF((x) => ({ ...x, ...p })); setPage(0); };

  const q = useQuery({
    queryKey: ["admin", "passport-access-log", f.from, f.to],
    queryFn: async (): Promise<AccessLogRow[]> => {
      let qb = sb.from("passport_access_log")
        .select("id,passport_id,actor_id,actor_type,action,resource,ip_address,user_agent,metadata,created_at");
      if (f.from) qb = qb.gte("created_at", new Date(`${f.from}T00:00:00`).toISOString());
      if (f.to) qb = qb.lte("created_at", new Date(`${f.to}T23:59:59.999`).toISOString());
      const { data, error } = await qb.order("created_at", { ascending: false }).limit(LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []) as AccessLogRow[];
    },
  });

  const rows = useMemo(() => filterAccessLog(q.data ?? [], f), [q.data, f]);
  const s = useMemo(() => summarizeAccessLog(rows), [rows]);
  const pageRows = rows.slice(page * 50, page * 50 + 50);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><KeyRound className="h-5 w-5" /> Passport Access Log</h1>
        <p className="text-sm text-muted-foreground">Every share-link creation, open, denial and revocation. Visible to platform admins only.</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-5">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} /></div>
          <div className="space-y-1"><Label className="text-xs">IP contains</Label><Input placeholder="e.g. 203.0" value={f.ip ?? ""} onChange={(e) => set({ ip: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">User-agent contains</Label><Input placeholder="e.g. curl" value={f.userAgent ?? ""} onChange={(e) => set({ userAgent: e.target.value })} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Token status</Label>
            <select value={f.status ?? ""} onChange={(e) => set({ status: e.target.value as TokenStatus | "" })} className="h-10 w-full rounded-md border bg-background px-2 text-sm" aria-label="Token status">
              <option value="">All</option>
              {(Object.keys(TOKEN_STATUS_LABEL) as TokenStatus[]).map((k) => <option key={k} value={k}>{TOKEN_STATUS_LABEL[k]}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Entries", s.total], ["Opens", s.byStatus.accessed ?? 0], ["Denied", s.denied], ["Unique IPs", s.uniqueIps]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{v}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TOKEN_STATUS_LABEL) as TokenStatus[]).filter((k) => s.byStatus[k]).map((k) => (
          <button key={k} type="button" onClick={() => set({ status: f.status === k ? "" : k })}>
            <Badge variant={statusVariant(k)}>{TOKEN_STATUS_LABEL[k]}: {s.byStatus[k]}</Badge>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TopList title="Top IPs" items={s.topIps} />
        <TopList title="Top denied IPs" items={s.topDeniedIps} />
        <TopList title="Top user-agents" items={s.topUserAgents} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Entries {q.data && q.data.length >= LIMIT && <span className="text-xs font-normal text-muted-foreground">(latest {LIMIT} in range — narrow the dates to see older)</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : (
            <>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Actor</TableHead><TableHead>IP</TableHead><TableHead>User-agent</TableHead><TableHead>Passport</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const st = tokenStatusOf(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={statusVariant(st)} className="text-[10px]">{TOKEN_STATUS_LABEL[st]}</Badge></TableCell>
                        <TableCell className="text-xs">{r.actor_type}</TableCell>
                        <TableCell className="font-mono text-xs"><button type="button" className="hover:underline" onClick={() => set({ ip: r.ip_address ?? "" })}>{r.ip_address ?? "—"}</button></TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs" title={r.user_agent ?? ""}>{r.user_agent ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.passport_id.slice(0, 8)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {pageRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No entries match these filters.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{rows.length} matching</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={(page + 1) * 50 >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
