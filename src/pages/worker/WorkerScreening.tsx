import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { canSignConsent, screeningText, downloadScreeningBlob, type ScreeningDocument } from "@/lib/screening/documents";

type Kind = "report" | "consent";
async function readDocuments(kind: Kind, id?: string): Promise<ScreeningDocument[]> {
  const { data, error } = await supabase.rpc("read_worker_screening", { _record_type: kind, _record_id: id });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as unknown as ScreeningDocument[];
}

export default function WorkerScreening() {
  const { user } = useAuth();
  const reports = useQuery({ queryKey: ["worker-screening", user?.id, "report"], enabled: !!user,
    queryFn: () => readDocuments("report"), retry: false });
  const consents = useQuery({ queryKey: ["worker-screening", user?.id, "consent"], enabled: !!user,
    queryFn: () => readDocuments("consent"), retry: false });
  return <div className="space-y-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-5 w-5" />My Screening</h1>
    {([{ title: "Reports", kind: "report" as const, query: reports }, { title: "Consent forms", kind: "consent" as const, query: consents }]).map(section =>
      <section key={section.kind} className="space-y-3">
        <h2 className="text-lg font-semibold">{section.title}</h2>
        {section.query.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {section.query.error && <p role="alert" className="text-destructive">{section.query.error.message}</p>}
        {section.query.data?.length === 0 && <p className="text-muted-foreground">No {section.title.toLowerCase()} available.</p>}
        {section.query.data?.map(record => <Card key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{section.kind === "report" ? "Screening report" : record.consent_type ?? "Consent form"}</p>
            <p className="text-xs text-muted-foreground">Version {record.document_version} · {new Date(record.received_at ?? record.created_at ?? "").toLocaleDateString()}</p>
            <Badge variant="secondary">{section.kind === "report" ? record.result ?? "Received" : record.signed_at ? "Signed" : "Signature pending"}</Badge>
          </div>
          <Button asChild variant="outline"><Link to={`/worker/screening/${section.kind}/${record.id}`}><FileText className="mr-2 h-4 w-4" />Open</Link></Button>
        </Card>)}
      </section>)}
  </div>;
}

export function WorkerScreeningDocument({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ blob: Blob; filename: string } | null>(null);
  const query = useQuery({ queryKey: ["worker-screening", user?.id, kind, id], enabled: !!user && !!id,
    queryFn: () => readDocuments(kind, id), retry: false });
  const record = query.data?.[0];

  async function sign() {
    if (!record || !canSignConsent(record, acknowledged)) return;
    setBusy(true); setError(null); setPrepared(null);
    try {
      const { error } = await supabase.rpc("sign_screening_consent_version", { _consent_id: record.id, _expected_version: record.document_version });
      if (error) throw error;
      setAcknowledged(false);
      await qc.invalidateQueries({ queryKey: ["worker-screening", user?.id] });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function prepare() {
    if (!record) return;
    setBusy(true); setError(null); setPrepared(null);
    try {
      const { data, error } = await supabase.rpc("download_worker_screening", {
        _record_type: kind, _record_id: record.id, _expected_version: record.document_version,
      });
      if (error) throw error;
      const payload = data as unknown as { record: ScreeningDocument; document_url: string | null };
      let blob: Blob, extension = "txt";
      if (payload.document_url) {
        const url = new URL(payload.document_url);
        if (url.protocol !== "https:") throw new Error("The agency document link is unavailable. Contact your agency for a secure copy.");
        const response = await fetch(url.href, { credentials: "omit" });
        if (!response.ok) throw new Error("The original document could not be downloaded. Contact your agency for a current document link.");
        blob = await response.blob();
        if (!blob.size || blob.type.includes("text/html")) throw new Error("The document link did not return a document.");
        extension = blob.type.includes("pdf") ? "pdf" : url.pathname.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
      } else {
        blob = new Blob([screeningText(kind, payload.record)], { type: "text/plain;charset=utf-8" });
      }
      setPrepared({ blob, filename: `screening-${kind}-${record.id}-v${record.document_version}.${extension}` });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <Button asChild variant="ghost" size="sm"><Link to="/worker/screening"><ArrowLeft className="mr-2 h-4 w-4" />My Screening</Link></Button>
    <h1 className="text-2xl font-bold">{kind === "report" ? "Screening report" : "Consent form"}</h1>
    {query.isLoading && <p>Loading…</p>}
    {query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}
    {query.isSuccess && !record && <p role="alert">This document is unavailable or is not assigned to you.</p>}
    {record && <>
      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Version {record.document_version}</Badge>
        <span className="text-sm text-muted-foreground">{kind === "report" ? record.result : record.consent_type}</span></div>
      {kind === "report" ? <section className="space-y-3 border-y py-5">
        <h2 className="font-semibold">Report summary</h2>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm">{typeof record.summary === "string" ? record.summary : JSON.stringify(record.summary ?? {}, null, 2)}</pre>
      </section> : <section className="space-y-4 border-y py-5">
        <p className="whitespace-pre-wrap break-words text-sm">{record.consent_text?.trim() || "Consent wording has not been provided. Contact your agency before signing."}</p>
        {record.signed_at ? <p role="status" className="font-medium">Signed on {new Date(record.signed_at).toLocaleString()} · Version {record.document_version}</p>
          : <><div className="flex items-start gap-3"><Checkbox id="consent-ack" checked={acknowledged} disabled={!record.consent_text?.trim() || busy}
            onCheckedChange={v => setAcknowledged(v === true)} /><label htmlFor="consent-ack" className="text-sm">I have read this consent and agree to sign version {record.document_version} electronically.</label></div>
            <Button disabled={busy || !canSignConsent(record, acknowledged)} onClick={sign}>{busy ? "Please wait…" : "Sign consent"}</Button></>}
      </section>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={busy} onClick={prepare}><Download className="mr-2 h-4 w-4" />{busy ? "Please wait…" : record.has_document ? "Prepare original download" : "Prepare text copy"}</Button>
        {prepared && <Button onClick={() => downloadScreeningBlob(prepared.blob, prepared.filename)}><Download className="mr-2 h-4 w-4" />Download</Button>}
      </div>
    </>}
  </div>;
}