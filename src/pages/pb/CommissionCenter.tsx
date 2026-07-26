import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCommissionRules, useCommissionRecords, useComputeCommissions } from "@/hooks/pb/use-pb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TYPES = ["placement", "margin", "referral", "override", "split"];

export default function CommissionCenter() {
  const { agencyId } = useAuth();
  const { data: rules = [], refetch: refetchRules } = useCommissionRules(agencyId ?? undefined);
  const { data: records = [] } = useCommissionRecords(agencyId ?? undefined);
  const compute = useComputeCommissions();
  const [form, setForm] = useState({ name: "", recruiter_id: "", rule_type: "placement", rate: "0.05" });

  const addRule = async () => {
    if (!agencyId || !form.name) return toast.error("name required");
    const { error } = await supabase.from("pb_commission_rules" as Any).insert({
      agency_id: agencyId, name: form.name, recruiter_id: form.recruiter_id || null,
      rule_type: form.rule_type, config: { rate: Number(form.rate) }, active: true,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", recruiter_id: "", rule_type: "placement", rate: "0.05" });
    refetchRules();
    toast.success("Rule added");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Commission Rules</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="recruiter_id" value={form.recruiter_id} onChange={(e) => setForm({ ...form, recruiter_id: e.target.value })} />
          <select className="border rounded p-2 text-sm" value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input type="number" step="0.01" placeholder="Rate (decimal)" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
        </div>
        <Button size="sm" onClick={addRule}>Add rule</Button>
        <div className="text-xs space-y-1 max-h-48 overflow-auto">
          {rules.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>{String(r.name)} · {String(r.rule_type)}</span>
              <span>{(Number((r.config as Record<string, unknown>)?.rate ?? 0) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={async () => {
          if (!agencyId) return;
          const r = await compute.mutateAsync({ agency_id: agencyId });
          toast.success(`Computed ${r.count} commission records`);
        }}>Compute commissions</Button>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Recent Commission Records</h3>
        <div className="text-xs space-y-1 max-h-96 overflow-auto">
          {records.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>R:{String(r.recruiter_id).slice(0, 8)} · basis ${Number(r.basis_amount).toFixed(2)}</span>
              <span className="flex gap-2 items-center">
                <span>${Number(r.amount).toFixed(2)}</span>
                <Badge variant="secondary">{String(r.status)}</Badge>
              </span>
            </div>
          ))}
          {records.length === 0 && <div className="text-muted-foreground">No records.</div>}
        </div>
      </Card>
    </div>
  );
}
