import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePassport, usePassportBundle } from "@/hooks/passport/use-workforce-passport";
import { LoadingState } from "@/components/woic/AsyncState";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

function List<T extends { id: string }>({ items, render, empty }: { items: T[]; render: (i: T) => React.ReactNode; empty: string }) {
  if (!items.length) return <p className="text-muted-foreground">{empty}</p>;
  return <div className="space-y-2">{items.map((i) => <div key={i.id} className="border-b pb-2 last:border-0">{render(i)}</div>)}</div>;
}

export function PassportIdentity() {
  const { passportId } = useParams();
  const { data: p, isLoading } = usePassport(passportId);
  if (isLoading || !p) return <LoadingState />;
  return (
    <Section title="Identity">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Legal name:</span> {p.legal_name || "—"}</div>
        <div><span className="text-muted-foreground">Preferred name:</span> {p.preferred_name || "—"}</div>
        <div><span className="text-muted-foreground">Gov ID:</span> {p.govid_status}</div>
        <div><span className="text-muted-foreground">Right to work:</span> {p.right_to_work_status}</div>
        <div><span className="text-muted-foreground">Verification:</span> {p.identity_verification_status}</div>
        <div><span className="text-muted-foreground">Languages:</span> {(p.languages ?? []).join(", ") || "—"}</div>
        <div><span className="text-muted-foreground">Veteran:</span> {p.veteran_status ? "Yes" : "No"}</div>
        <div><span className="text-muted-foreground">Availability:</span> {p.availability_status}</div>
      </div>
    </Section>
  );
}

export function PassportSkills() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Skills"><List items={b.data?.skills ?? []} empty="No skills recorded." render={(s: any) => <div><div className="font-medium">{s.skill}</div><div className="text-xs text-muted-foreground">Level: {s.level ?? "—"}</div></div>} /></Section>;
}

export function PassportCertifications() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Certifications"><List items={b.data?.credentials ?? []} empty="No certifications." render={(c: any) => <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.issuer ?? ""} {c.expires_on ? `· Expires ${new Date(c.expires_on).toLocaleDateString()}` : ""}</div></div>} /></Section>;
}

export function PassportTraining() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Training"><List items={b.data?.training ?? []} empty="No training records." render={(t: any) => <div><div className="font-medium">{t.training_courses?.title ?? "Course"}</div><div className="text-xs text-muted-foreground">Status: {t.status ?? "—"}</div></div>} /></Section>;
}

export function PassportEmployment() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Employment History"><List items={b.data?.employment ?? []} empty="No employment history." render={(e: any) => <div><div className="font-medium">{e.role ?? "—"} · {e.employer}</div><div className="text-xs text-muted-foreground">{e.started_on ?? ""} – {e.ended_on ?? "present"}</div>{e.description && <div className="text-xs mt-1">{e.description}</div>}</div>} /></Section>;
}

export function PassportCompliancePage() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Compliance"><List items={b.data?.compliance ?? []} empty="No compliance items." render={(c: any) => <div className="flex justify-between"><div><div className="font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{c.requirement_type} {c.expires_at ? `· Expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}</div></div><span className="text-xs">{c.status}</span></div>} /></Section>;
}

export function PassportDocuments() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Documents"><List items={b.data?.documents ?? []} empty="No documents uploaded." render={(d: any) => <div><div className="font-medium">{d.filename ?? d.name ?? "Document"}</div><div className="text-xs text-muted-foreground">{d.doc_type ?? d.category ?? ""}</div></div>} /></Section>;
}

export function PassportPortfolio() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Portfolio"><List items={b.data?.portfolio ?? []} empty="No portfolio items." render={(i: any) => <div><div className="font-medium">{i.title}</div><div className="text-xs text-muted-foreground">{i.kind}</div>{i.description && <div className="text-xs mt-1">{i.description}</div>}</div>} /></Section>;
}

export function PassportTimeline() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Timeline"><List items={b.data?.timeline ?? []} empty="No events." render={(t: any) => <div><div className="font-medium">{t.title}</div><div className="text-xs text-muted-foreground">{new Date(t.event_date).toLocaleString()} · {t.event_type}</div></div>} /></Section>;
}

export function PassportCareerCoach() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="AI Career Coach Recommendations"><List items={b.data?.recommendations ?? []} empty="No recommendations yet. Run the AI Career Coach from the Home tab." render={(r: any) => <div><div className="font-medium">{r.title} <span className="text-xs text-muted-foreground">· {r.category}</span></div>{r.description && <div className="text-xs mt-1">{r.description}</div>}</div>} /></Section>;
}

export function PassportOpportunities() {
  const { passportId } = useParams();
  const { data: p } = usePassport(passportId);
  const b = usePassportBundle(passportId, p?.worker_id);
  return <Section title="Opportunities"><List items={b.data?.opportunities ?? []} empty="No opportunities." render={(o: any) => <div><div className="font-medium">{o.title} <span className="text-xs text-muted-foreground">· {o.kind}</span></div>{o.reasoning && <div className="text-xs mt-1">{o.reasoning}</div>}</div>} /></Section>;
}
