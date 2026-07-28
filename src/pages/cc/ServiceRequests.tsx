import { useParams } from "react-router-dom";
import { useState } from "react";
import { useCcRequests, useCreateCcRequest } from "@/hooks/cc/use-client-collab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KINDS = [
  { v: "additional_workers", l: "Additional Workers" },
  { v: "replacement", l: "Replacement" },
  { v: "schedule_change", l: "Schedule Change" },
  { v: "payroll_question", l: "Payroll Question" },
  { v: "billing_question", l: "Billing Question" },
  { v: "compliance_review", l: "Compliance Review" },
  { v: "general", l: "General" },
];

export default function ServiceRequests() {
  const { clientId } = useParams();
  const { data } = useCcRequests(clientId);
  const create = useCreateCcRequest();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("general");

  const submit = () => {
    if (!clientId || !subject.trim()) return;
    create.mutate({ client_id: clientId, kind, subject, body }, {
      onSuccess: () => { setSubject(""); setBody(""); },
    });
  };

  const cols = { open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">New Service Request</h3>
        <div className="grid gap-2 md:grid-cols-[200px_1fr]">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <Textarea placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!subject.trim() || create.isPending}>Submit</Button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(cols).map(([k, label]) => (
          <div key={k} className="rounded-xl border bg-card">
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
              <Badge variant="outline">{(data ?? []).filter((r) => r.status === k).length}</Badge>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {(data ?? []).filter((r) => r.status === k).map((r) => (
                <div key={r.id} className="px-3 py-2">
                  <p className="text-sm font-medium truncate">{r.subject}</p>
                  <p className="text-xs text-muted-foreground">{r.kind}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
