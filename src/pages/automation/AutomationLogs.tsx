import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAutomationRuns } from "@/hooks/automation/use-automation";
import { format } from "date-fns";

export default function AutomationLogs() {
  const q = useAutomationRuns(500);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<"all" | "succeeded" | "failed">("all");

  const rows = (q.data ?? []).filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (filter && !JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search error, automation id, output…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md"
            />
            <select
              className="rounded border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Status</th>
                  <th className="p-2">Automation</th>
                  <th className="p-2">Event</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Ran at</th>
                  <th className="p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      <Badge variant={r.status === "succeeded" ? "default" : "destructive"}>{r.status}</Badge>
                    </td>
                    <td className="p-2 font-mono">{r.automation_id.slice(0, 8)}</td>
                    <td className="p-2 font-mono">{r.event_id?.slice(0, 8) ?? "-"}</td>
                    <td className="p-2">{r.duration_ms ?? "-"} ms</td>
                    <td className="p-2 text-muted-foreground">{format(new Date(r.ran_at), "MMM d HH:mm:ss")}</td>
                    <td className="p-2 text-red-600">{r.error ?? ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No matching runs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
