import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useClientRequirements, useSaveClientRequirement } from "@/hooks/onboarding/use-onboarding-os";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function ClientRequirementsPage() {
  const { agencyId } = useAuth();
  const { data: requirements = [] } = useClientRequirements(agencyId ?? undefined);
  const save = useSaveClientRequirement();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-simple", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("agency_id", agencyId!).order("name");
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [bg, setBg] = useState(false);
  const [drug, setDrug] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">New requirement profile</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profile name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Standard" />
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={bg} onCheckedChange={setBg} /> Background check required</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={drug} onCheckedChange={setDrug} /> Drug screen required</label>
          <div className="md:col-span-2">
            <Button
              disabled={!agencyId || !clientId || !name || save.isPending}
              onClick={async () => {
                await save.mutateAsync({
                  agency_id: agencyId!,
                  client_id: clientId,
                  name,
                  background_required: bg,
                  drug_screen_required: drug,
                });
                setName(""); setClientId(""); setBg(false); setDrug(false);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {requirements.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{r.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{r.client?.name}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {r.background_required && <Badge variant="secondary">Background</Badge>}
              {r.drug_screen_required && <Badge variant="secondary">Drug screen</Badge>}
              {r.required_certifications.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              {r.required_licenses.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
              {!r.background_required && !r.drug_screen_required && r.required_certifications.length === 0 && r.required_licenses.length === 0 && (
                <span className="text-xs text-muted-foreground">No specific requirements.</span>
              )}
            </CardContent>
          </Card>
        ))}
        {requirements.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No client requirement profiles yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
