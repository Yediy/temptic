import { useParams } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSharingLinks, useCreateSharingLink, useRevokeSharingLink } from "@/hooks/passport/use-workforce-passport";
import { toast } from "@/hooks/use-toast";
import { Copy, QrCode } from "lucide-react";

const DEFAULT_SCOPES = ["identity", "skills", "certifications", "training", "employment"];

function qrUrl(data: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PassportSharing() {
  const { passportId } = useParams<{ passportId: string }>();
  const links = useSharingLinks(passportId);
  const create = useCreateSharingLink(passportId!);
  const revoke = useRevokeSharingLink(passportId!);
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [scopes] = useState<string[]>(DEFAULT_SCOPES);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const shareUrl = (token: string) =>
    `${window.location.origin}/passport/share/${token}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Create a Share Link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Label (e.g. Acme Interview)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input type="number" min="1" placeholder="Expires in days" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
          </div>
          <div className="text-xs text-muted-foreground">Shared scopes: {scopes.join(", ")}</div>
          <Button
            size="sm"
            onClick={() => {
              const days = Math.max(1, parseInt(expiresInDays || "7", 10));
              const expires_at = new Date(Date.now() + days * 86400000).toISOString();
              create.mutate(
                { label: label || undefined, scopes, expires_at },
                {
                  onSuccess: ({ token }) => {
                    setLastToken(token);
                    setLabel("");
                    toast({ title: "Share link created", description: "Copy or scan the QR before leaving this screen." });
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
                Save this link now — for security we only show it once.
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
                <img src={qrUrl(shareUrl(lastToken))} alt="Share QR code" width={180} height={180} className="rounded border" />
                <div className="text-xs text-muted-foreground flex items-start gap-2">
                  <QrCode className="h-4 w-4 mt-0.5" />
                  <span>Scan to open the passport view. The link honors the scopes and expiration set above.</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Active Share Links</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(links.data ?? []).map((l) => {
            const revoked = !!l.revoked_at;
            const expired = l.expires_at ? new Date(l.expires_at).getTime() < Date.now() : false;
            const status = revoked ? "revoked" : expired ? "expired" : "active";
            return (
              <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.label ?? "Untitled link"}</div>
                  <div className="text-xs text-muted-foreground">
                    Scopes: {(l.scopes ?? []).join(", ")} ·{" "}
                    {l.expires_at ? `Expires ${new Date(l.expires_at).toLocaleDateString()}` : "No expiration"} ·{" "}
                    {l.view_count} views
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
                  {status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => revoke.mutate(l.id)}>Revoke</Button>
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
