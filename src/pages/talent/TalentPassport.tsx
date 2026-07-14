import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePassport, useUpsertWorkerProfile, useAddCredential, useAddEmployment, useSetEmergencyContact, useResumeParseRuns, useStartResumeParse, useApplyResumeSuggestions, computePassportSections, computeCompletionScore } from "@/hooks/use-passport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, X, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export default function TalentPassport() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = usePassport(id);
  const upsert = useUpsertWorkerProfile(id);
  const addCred = useAddCredential(id);
  const addEmp = useAddEmployment(id);
  const addEmergency = useSetEmergencyContact(id);
  const startParse = useStartResumeParse(id);
  const { data: parseRuns = [] } = useResumeParseRuns(id);
  const applySugg = useApplyResumeSuggestions(id);

  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [trades, setTrades] = useState("");
  const [location, setLocation] = useState("");
  const [travelRadius, setTravelRadius] = useState("");
  const [transport, setTransport] = useState("");
  const [credName, setCredName] = useState("");
  const [credIssuer, setCredIssuer] = useState("");
  const [credExpires, setCredExpires] = useState("");
  const [empEmployer, setEmpEmployer] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empStart, setEmpStart] = useState("");
  const [empEnd, setEmpEnd] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");

  if (isLoading || !data) {
    return <div className="p-6 max-w-4xl mx-auto"><Card><CardContent className="py-12 text-center text-muted-foreground">Loading passport…</CardContent></Card></div>;
  }

  const sections = computePassportSections(data);
  const score = computeCompletionScore(sections);
  const w = data.worker;
  const p = data.profile;

  const saveProfile = async (patch: Record<string, unknown>) => {
    await upsert.mutateAsync(patch);
    toast.success("Passport updated");
  };

  const latestRun = parseRuns[0];
  const suggestions = (latestRun?.status === "completed" && latestRun.parsed_fields) ? latestRun.parsed_fields as Record<string, unknown> : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/talent")}><ArrowLeft className="w-4 h-4 mr-2" /> Talent</Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-2xl">{w.first_name} {w.last_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{w.email} · {w.phone || "no phone"}</p>
            </div>
            <div className="text-right min-w-[180px]">
              <div className="text-3xl font-bold">{score}%</div>
              <p className="text-xs text-muted-foreground">Passport completion</p>
              <Progress value={score} className="mt-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {sections.map((s) => (
              <div key={s.key} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                {s.complete ? <Check className="w-4 h-4 text-green-600 mt-0.5" /> : <X className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">{s.weight}%</span>
                  </div>
                  {!s.complete && s.missing[0] && <p className="text-muted-foreground truncate">Need: {s.missing[0]}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI resume assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI résumé assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a résumé to <b>Documents</b> below, then let the AI suggest bio, trades, years of experience, and employment history. Every field is a suggestion — nothing writes to the passport until you accept it.
          </p>
          <Button
            variant="outline"
            disabled={startParse.isPending}
            onClick={async () => {
              try {
                await startParse.mutateAsync(undefined);
                toast.success("Résumé parsed");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to parse résumé");
              }
            }}
          >
            {startParse.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Run résumé parser
          </Button>
          {suggestions && (
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <p className="font-medium">Latest suggestions</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">{JSON.stringify(suggestions, null, 2)}</pre>
              <Button size="sm" onClick={() => applySugg.mutate({ runId: latestRun!.id, accepted: suggestions })}>
                Accept all suggestions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identity + skills */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>General location</Label><Input defaultValue={p?.general_location || ""} onBlur={(e) => setLocation(e.target.value)} placeholder="e.g. Houston, TX" /></div>
            <div><Label>Years of experience</Label><Input type="number" defaultValue={p?.years_experience || ""} onBlur={(e) => setYears(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Trade specialties (comma separated)</Label><Input defaultValue={p?.trade_specialties?.join(", ") || ""} onBlur={(e) => setTrades(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Bio</Label><Textarea defaultValue={p?.bio || ""} onBlur={(e) => setBio(e.target.value)} rows={3} /></div>
            <div><Label>Travel radius (miles)</Label><Input type="number" defaultValue={p?.travel_radius_miles || ""} onBlur={(e) => setTravelRadius(e.target.value)} /></div>
            <div><Label>Transportation</Label><Input defaultValue={p?.transportation_status || ""} onBlur={(e) => setTransport(e.target.value)} placeholder="own vehicle / needs ride" /></div>
          </div>
          <Button onClick={() => saveProfile({
            bio: bio || p?.bio,
            years_experience: years ? Number(years) : p?.years_experience,
            trade_specialties: trades ? trades.split(",").map((s) => s.trim()).filter(Boolean) : p?.trade_specialties,
            general_location: location || p?.general_location,
            travel_radius_miles: travelRadius ? Number(travelRadius) : p?.travel_radius_miles,
            transportation_status: transport || p?.transportation_status,
          })}>Save profile</Button>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Emergency contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.emergency[0] ? (
            <p className="text-sm">On file: <b>{data.emergency[0].name}</b> · {data.emergency[0].phone} · {data.emergency[0].relationship || "—"}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
              <Input placeholder="Phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
              <Input placeholder="Relationship" value={ecRelationship} onChange={(e) => setEcRelationship(e.target.value)} />
            </div>
          )}
          {!data.emergency[0] && (
            <Button onClick={async () => {
              if (!ecName || !ecPhone) return toast.error("Name and phone required");
              await addEmergency.mutateAsync({ name: ecName, phone: ecPhone, relationship: ecRelationship });
              toast.success("Contact saved");
            }}><Plus className="w-4 h-4 mr-1" /> Add contact</Button>
          )}
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Credentials</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No credentials yet.</p>
          ) : (
            <div className="space-y-2">
              {data.credentials.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <Badge variant="outline">{c.name}</Badge>
                  <span className="text-muted-foreground">{c.issuer || "—"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Expires: {c.expires_on || "—"}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Credential name" value={credName} onChange={(e) => setCredName(e.target.value)} />
            <Input placeholder="Issuer" value={credIssuer} onChange={(e) => setCredIssuer(e.target.value)} />
            <Input type="date" value={credExpires} onChange={(e) => setCredExpires(e.target.value)} />
          </div>
          <Button size="sm" onClick={async () => {
            if (!credName) return toast.error("Name required");
            await addCred.mutateAsync({ name: credName, issuer: credIssuer, expires_on: credExpires || null });
            setCredName(""); setCredIssuer(""); setCredExpires("");
            toast.success("Credential added");
          }}><Plus className="w-4 h-4 mr-1" /> Add credential</Button>
        </CardContent>
      </Card>

      {/* Employment history */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Employment history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.employment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employment history yet.</p>
          ) : (
            <div className="space-y-2">
              {data.employment.map((e) => (
                <div key={e.id} className="rounded border p-2 text-sm">
                  <p className="font-medium">{e.employer} · <span className="font-normal text-muted-foreground">{e.role || ""}</span></p>
                  <p className="text-xs text-muted-foreground">{e.started_on || "?"} → {e.ended_on || "present"}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Employer" value={empEmployer} onChange={(e) => setEmpEmployer(e.target.value)} />
            <Input placeholder="Role" value={empRole} onChange={(e) => setEmpRole(e.target.value)} />
            <Input type="date" value={empStart} onChange={(e) => setEmpStart(e.target.value)} />
            <Input type="date" value={empEnd} onChange={(e) => setEmpEnd(e.target.value)} />
          </div>
          <Button size="sm" onClick={async () => {
            if (!empEmployer) return toast.error("Employer required");
            await addEmp.mutateAsync({ employer: empEmployer, role: empRole || null, started_on: empStart || null, ended_on: empEnd || null } as never);
            setEmpEmployer(""); setEmpRole(""); setEmpStart(""); setEmpEnd("");
            toast.success("Entry added");
          }}><Plus className="w-4 h-4 mr-1" /> Add entry</Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Documents, training, screening, and full skills matrix ship in later Workforce OS phases. Nothing here removes or renames existing Temp Tic worker fields.</p>
      <Link to={`/workers`} className="text-sm text-primary hover:underline">← Back to workers list</Link>
      {/* satisfy Json import for future use */}
      <span className="hidden" data-json={JSON.stringify({} as Json)} />
    </div>
  );
}
