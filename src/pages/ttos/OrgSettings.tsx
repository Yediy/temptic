import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const SECTIONS = [
  "branding",
  "notifications",
  "automation_defaults",
  "approval_rules",
  "payroll_defaults",
  "compliance_defaults",
  "ai_preferences",
  "document_retention",
  "security_policies",
] as const;

type Row = Record<(typeof SECTIONS)[number], Record<string, unknown>> & { agency_id: string };

export default function OrgSettings() {
  const { agencyId } = useAuth();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      const { data } = await supabase.from("ttos_org_settings").select("*").eq("agency_id", agencyId).maybeSingle();
      const base = (data ?? { agency_id: agencyId }) as Row;
      setRow(base);
      const d: Record<string, string> = {};
      SECTIONS.forEach((s) => { d[s] = JSON.stringify(base[s] ?? {}, null, 2); });
      setDrafts(d);
    })();
  }, [agencyId]);

  async function save(section: (typeof SECTIONS)[number]) {
    if (!agencyId) return;
    let parsed: unknown;
    try { parsed = JSON.parse(drafts[section]); }
    catch (e) { toast({ title: "Invalid JSON", description: (e as Error).message, variant: "destructive" }); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("ttos_org_settings").upsert({
      agency_id: agencyId,
      [section]: parsed,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved", description: section });
  }

  if (!row) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Organization settings</h1>
      {SECTIONS.map((s) => (
        <Card key={s}>
          <CardHeader><CardTitle className="capitalize">{s.replace(/_/g, " ")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={drafts[s] ?? "{}"}
              onChange={(e) => setDrafts((d) => ({ ...d, [s]: e.target.value }))}
            />
            <Button size="sm" onClick={() => save(s)}>Save</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
