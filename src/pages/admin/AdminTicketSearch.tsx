import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Ticket } from "lucide-react";
import { toast } from "sonner";

export default function AdminTicketSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, status, ticket_type, client_company_name_snapshot, worker_name_snapshot, created_at, total_hours")
        .ilike("ticket_number", `%${query.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setResults(data ?? []);
      if (!data?.length) toast.info("No tickets found matching that number.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Ticket Search</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search by Ticket Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g. TT-2026-000001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-medium">{t.ticket_number}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="capitalize">{t.ticket_type}</TableCell>
                    <TableCell>{t.client_company_name_snapshot}</TableCell>
                    <TableCell>{t.worker_name_snapshot}</TableCell>
                    <TableCell>{t.total_hours ?? "—"}</TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
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
