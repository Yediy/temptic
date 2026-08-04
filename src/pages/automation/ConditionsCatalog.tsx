import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONDITION_JOINERS, CONDITION_OPERATORS, CONDITION_PRESETS, type ConditionJoiner, type ConditionOperator } from "@/lib/automation/catalog";

type Row = { id: number; join: ConditionJoiner; field: string; operator: ConditionOperator; value: string };

export default function ConditionsCatalog() {
  const [rows, setRows] = useState<Row[]>([{ id: 1, join: "and", field: "payload.status", operator: "eq", value: "approved" }]);

  const expression = rows
    .map((r, i) => `${i === 0 ? "IF" : r.join.toUpperCase()} ${r.field} ${r.operator} "${r.value}"`)
    .join(" ");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Expression builder</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="grid gap-2 md:grid-cols-[90px_1fr_150px_1fr_40px]">
              <Select value={r.join} onValueChange={(v) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, join: v as ConditionJoiner } : x))} disabled={i === 0}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_JOINERS.map((j) => <SelectItem key={j} value={j}>{j.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-9" value={r.field} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, field: e.target.value } : x))} placeholder="payload.field" />
              <Select value={r.operator} onValueChange={(v) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, operator: v as ConditionOperator } : x))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-9" value={r.value} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x))} placeholder="value" />
              <Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} disabled={rows.length === 1}>✕</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { id: Date.now(), join: "and", field: "", operator: "eq", value: "" }])}>
            Add condition
          </Button>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Preview</p>
            <pre className="overflow-auto rounded border bg-muted/40 p-2 text-[11px]">{expression}</pre>
            <pre className="mt-2 max-h-56 overflow-auto rounded border bg-muted/40 p-2 text-[10px]">
{JSON.stringify(rows.map(({ join, field, operator, value }) => ({ join, field, operator, value })), null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Presets</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {CONDITION_PRESETS.map((p) => (
            <button
              key={p.label}
              className="w-full rounded border p-2 text-left text-xs hover:bg-muted"
              onClick={() => setRows((rs) => [...rs, { id: Date.now(), join: "and", field: p.field, operator: p.operator, value: p.value }])}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.label}</span>
                <Badge variant="outline">{p.group}</Badge>
              </div>
              <code className="text-[10px] text-muted-foreground">{p.field}</code>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
