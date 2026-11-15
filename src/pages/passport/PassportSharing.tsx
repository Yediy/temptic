import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSharingLinks, useCreateSharingLink, useRevokeSharingLink } from "@/hooks/passport/use-workforce-passport";
import { toast } from "@/hooks/use-toast";
import { Copy, QrCode, ShieldCheck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { SHARE_SECTIONS, newRecipient, planRecipientLinks, type RecipientDraft, type ShareSection } from "@/lib/passport/share-recipients";

type CreateMutation = ReturnType<typeof useCreateSharingLink>;

function RecipientLinksCard({ create, shareUrl }: { passportId: string; create: CreateMutation; shareUrl: (t: string) => string }) {
  const [drafts, setDrafts] = useState<RecipientDraft[]>([newRecipient(crypto.randomUUID())]);
  const [results, setResults] = useState<{ label: string; token?: string; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const update = (key: string, patch: Partial<RecipientDraft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const generate = async () => {
    const plan = planRecipientLinks(drafts);
    if (plan.ok === false) { toast({ title: "Check recipients", description: plan.error, variant: "destructive" }); return; }
    setBusy(true);
    const out: typeof results = [];
    for (const req of plan.requests) {
      try { const { token } = await create.mutateAsync(req); out.push({ label: req.label, token }); }
      catch (e) { out.push({ label: req.label, error: e instanceof Error ? e.message : "Failed" }); }
    }
    setResults(out); setBusy(false);
    if (out.every((r) => r.token)) setDrafts([newRecipient(crypto.randomUUID())]);
    toast({ title: `${out.filter((r) => r.token).length} of ${out.length} links created`, description: "Copy them now — each is shown only once." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Share With Recipients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Each recipient gets their own link. All links are view-only; choose full access or only specific sections.</p>
        {drafts.map((d) => (
          <div key={d.key} className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Recipient</Label>
                <Input placeholder="e.g. Acme Staffing" value={d.name} onChange={(e) => update(d.key, { name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access</Label>
                <select value={d.access} onChange={(e) => update(d.key, { access: e.target.value as RecipientDraft["access"] })}
                  className="h-10 rounded-md border bg-background px-2 text-sm">
                  <option value="full">Full (read-only)</option>
                  <option value="limited">Limited sections</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expires (hours)</Label>
                <Input type="number" min="1" max="720" className="w-24" value={d.expiresInHours}
                  onChange={(e) => update(d.key, { expiresInHours: Number(e.target.value) })} />
              </div>
              <Button size="icon" variant="ghost" aria-label="Remove recipient" disabled={drafts.length === 1}
                onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {d.access === "limited" && (
              <div className="flex flex-wrap gap-3">
                {SHARE_SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-xs capitalize">
                    <Checkbox checked={d.sections.includes(s)} onCheckedChange={(c) => update(d.key, {
                      sections: c ? [...d.sections, s] : d.sections.filter((x) => x !== s) as ShareSection[],
                    })} />
                    {s.replace("_", " ")}
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2"><Switch checked={d.oneTime} onCheckedChange={(v) => update(d.key, { oneTime: v })} /> One-time link</label>
              {!d.oneTime && (
                <label className="flex items-center gap-2">Max views
                  <Input type="number" min="2" max="50" className="h-8 w-20" value={d.maxUses} onChange={(e) => update(d.key, { maxUses: Number(e.target.value) })} />
                </label>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={drafts.length >= 20} onClick={() => setDrafts((ds) => [...ds, newRecipient(crypto.randomUUID())])}>
            <Plus className="mr-1 h-4 w-4" /> Add recipient
          </Button>
          <Button size="sm" onClick={() => void generate()} disabled={busy}>
            {busy ? "Creating…" : `Generate ${drafts.length} link${drafts.length === 1 ? "" : "s"}`}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Save these links now — tokens are hashed on the server and never shown again.</div>
            {results.map((r) => (
              <div key={r.label} className="space-y-1.5">
                <div className="text-xs font-medium">{r.label}</div>
                {r.token ? (
                  <div className="flex items-center gap-2">
                    <Input readOnly value={shareUrl(r.token)} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" aria-label={`Copy link for ${r.label}`} onClick={() => { navigator.clipboard.writeText(shareUrl(r.token!)); toast({ title: "Copied" }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a href={qrUrl(shareUrl(r.token))} target="_blank" rel="noreferrer" aria-label={`QR code for ${r.label}`}>
                      <Button size="icon" variant="outline" type="button"><QrCode className="h-4 w-4" /></Button>
                    </a>
                  </div>
                ) : <p className="text-xs text-destructive">{r.error}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function qrUrl(data: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PassportSharing() {
  const { passportId } = useParams<{ passportId: string }>();
  const links = useSharingLinks(passportId);
  const create = useCreateSharingLink(passportId!);
  const revoke = useRevokeSharingLink(passportId!);

  const shareUrl = (token: string) => `${window.location.origin}/passport/share/${token}`;

  return (
    <div className="space-y-6">
      <RecipientLinksCard passportId={passportId!} create={create} shareUrl={shareUrl} />

      <Card>
        <CardHeader><CardTitle className="text-sm">Active Share Links</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(links.data ?? []).map((l: any) => {
            const revoked = !!l.revoked_at;
            const expired = l.expires_at ? new Date(l.expires_at).getTime() < Date.now() : false;
            const exhausted = (l.used_count ?? 0) >= (l.max_uses ?? 1);
            const status = revoked ? (l.revoked_reason === "single_use_consumed" ? "used" : "revoked")
              : expired ? "expired" : exhausted ? "used" : "active";
            return (
              <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.label ?? "Untitled link"}</div>
                  <div className="text-xs text-muted-foreground">
                    Scopes: {(l.scopes ?? []).join(", ")} ·{" "}
                    {l.expires_at ? `Expires ${new Date(l.expires_at).toLocaleString()}` : "No expiration"} ·{" "}
                    {l.used_count ?? 0}/{l.max_uses ?? 1} uses
                    {l.last_viewed_at ? ` · Last viewed ${new Date(l.last_viewed_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
                  {status === "active" && (
                    <Button size="sm" variant="destructive" disabled={revoke.isPending} onClick={() => revoke.mutate(l.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {(links.data ?? []).length === 0 && (
            <p className="text-muted-foreground">No share links yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
