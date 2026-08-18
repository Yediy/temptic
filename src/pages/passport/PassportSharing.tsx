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

const DEFAULT_SCOPES = ["identity", "skills", "credentials", "training", "work_history"];

function qrUrl(data: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PassportSharing() {
  const { passportId } = useParams<{ passportId: string }>();
  const links = useSharingLinks(passportId);
  const create = useCreateSharingLink(passportId!);
  const revoke = useRevokeSharingLink(passportId!);
  const [label, setLabel] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [oneTime, setOneTime] = useState(true);
  const [maxUses, setMaxUses] = useState("3");
  const [scopes] = useState<string[]>(DEFAULT_SCOPES);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const shareUrl = (token: string) => `${window.location.origin}/passport/share/${token}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Create a Share Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input placeholder="e.g. Acme Interview" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expires in (hours, max 720)</Label>
              <Input type="number" min="1" max="720" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">One-time link</div>
              <div className="text-xs text-muted-foreground">
                The link self-revokes the moment it is opened once.
              </div>
            </div>
            <Switch checked={oneTime} onCheckedChange={setOneTime} />
          </div>

          {!oneTime && (
            <div className="space-y-1.5">
              <Label className="text-xs">Maximum views (max 50)</Label>
              <Input type="number" min="2" max="50" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
          )}

          <div className="text-xs text-muted-foreground">Shared scopes: {scopes.join(", ")}</div>

          <Button
            size="sm"
            onClick={() => {
              const hours = Math.min(720, Math.max(1, parseInt(expiresInHours || "24", 10)));
              const uses = oneTime ? 1 : Math.min(50, Math.max(2, parseInt(maxUses || "3", 10)));
              create.mutate(
                { label: label || undefined, scopes, expires_in_hours: hours, max_uses: uses },
                {
                  onSuccess: ({ token }) => {
                    setLastToken(token);
                    setLabel("");
                    toast({ title: "Share link created", description: "Copy or scan it now — it is shown only once." });
                  },
                  onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
                },
              );
            }}
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Generate Link"}
          </Button>

          {lastToken && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                Save this link now — the token is hashed on the server and never shown again.
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl(lastToken)} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(shareUrl(lastToken));
                  toast({ title: "Copied" });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <img src={qrUrl(shareUrl(lastToken))} alt="Passport share QR code" width={180} height={180} className="rounded border" />
                <div className="text-xs text-muted-foreground flex items-start gap-2">
                  <QrCode className="h-4 w-4 mt-0.5" />
                  <span>Every open is verified and logged on the server before any data is returned.</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
