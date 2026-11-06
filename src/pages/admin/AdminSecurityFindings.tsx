import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";

type Finding = {
  internal_id: string; scanner: string; level: string; name: string; description: string | null;
  subject: string | null; status: "remaining" | "ignored" | "fixed";
  first_seen_at: string | null; last_seen_at: string | null; fixed_at: string | null; synced_at: string;
};
type Run = { scanner: string; scanned_at: string | null; completion_status: string | null; finding_count: number };

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
const levelVariant = (l: string): "destructive" | "default" | "secondary" => (l === "error" ? "destructive" : l === "warn" ? "default" : "secondary");
const statusClass: Record<string, string> = {
  remaining: "bg-destructive/15 text-destructive",
  ignored: "bg-muted text-muted-foreground",
  fixed: "bg-primary/15 text-primary",
};

export default function AdminSecurityFindings() {
  const [status, setStatus] = useState<"all" | Finding["status"]>("remaining");
  const [q, setQ] = useState("");

  const findings = useQuery({
    queryKey: ["security_findings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("security_findings" as never).select("*").order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Finding[];
    },
  });
  const runs = useQuery({
    queryKey: ["security_scan_runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("security_scan_runs" as never).select("*").order("scanner");
      if (error) throw error;
      return (data ?? []) as unknown as Run[];
    },
  });

  const all = findings.data ?? [];
  const counts = useMemo(() => ({
    remaining: all.filter((f) => f.status === "remaining").length,
    ignored: all.filter((f) => f.status === "ignored").length,
    fixed: all.filter((f) => f.status === "fixed").length,
  }), [all]);
  const rows = all.filter((f) =>
    (status === "all" || f.status === status) &&
    (!q || `${f.internal_id} ${f.name} ${f.subject ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const lastSync = all.reduce<string | null>((m, f) => (!m || f.synced_at > m ? f.synced_at : m), null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Security Findings</h1>
          <p className="text-sm text-muted-foreground">Last synced {fmt(lastSync)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(["remaining", "ignored", "fixed"] as const).map((s) => (
          <Card key={s} className={`cursor-pointer ${status === s ? "ring-2 ring-primary" : ""}`} onClick={() => setStatus(s)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm capitalize text-muted-foreground">{s}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold font-mono">{counts[s]}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Scanners</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Scanner</TableHead><TableHead>Last scan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Open findings</TableHead></TableRow></TableHeader>
            <TableBody>
              {(runs.data ?? []).map((r) => (
                <TableRow key={r.scanner}>
                  <TableCell className="font-mono text-xs">{r.scanner}</TableCell>
                  <TableCell>{fmt(r.scanned_at)}</TableCell>
                  <TableCell>{r.completion_status ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.finding_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Findings</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search ID, title, table…" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
            {(["all", "remaining", "ignored", "fixed"] as const).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="capitalize">{s}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {findings.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : findings.error ? <p className="text-sm text-destructive">Could not load findings.</p>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground">No findings match.</p>
            : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Internal ID</TableHead><TableHead>Finding</TableHead><TableHead>Level</TableHead>
                <TableHead>Status</TableHead><TableHead>First seen</TableHead><TableHead>Last seen</TableHead><TableHead>Fixed</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.internal_id}>
                    <TableCell className="max-w-[220px] break-all font-mono text-xs">{f.internal_id}<div className="text-muted-foreground">{f.scanner}</div></TableCell>
                    <TableCell className="max-w-md"><div className="font-medium">{f.name}</div><div className="text-xs text-muted-foreground">{f.description}</div></TableCell>
                    <TableCell><Badge variant={levelVariant(f.level)}>{f.level}</Badge></TableCell>
                    <TableCell><span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${statusClass[f.status]}`}>{f.status}</span></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmt(f.first_seen_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmt(f.last_seen_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{f.status === "fixed" ? fmt(f.fixed_at) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
