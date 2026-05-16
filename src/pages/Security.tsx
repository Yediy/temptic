import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Loader2, Trash2 } from "lucide-react";

interface Factor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
  created_at: string;
}

interface Enrolling {
  factorId: string;
  qr: string;
  secret: string;
}

export default function Security() {
  const { roles } = useAuth();
  const adminLike = roles.some((r) => ["super_admin", "agency_admin"].includes(r));
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.factor_type === "totp"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verified = factors.filter((f) => f.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    // Clean up any prior unverified factors to avoid friendly-name collisions
    for (const f of factors.filter((f) => f.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator (${new Date().toLocaleDateString()})`,
    });
    setBusy(false);
    if (error || !data) {
      toast({ title: "Could not start enrollment", description: error?.message, variant: "destructive" });
      return;
    }
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Two-factor authentication enabled" });
    setEnrolling(null);
    setCode("");
    await load();
  };

  const cancelEnroll = async () => {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    await load();
  };

  const remove = async (factorId: string) => {
    if (!confirm("Disable two-factor authentication for this account?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Two-factor authentication disabled" });
    await load();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Security</h1>
        <p className="text-sm text-muted-foreground">
          Protect {adminLike ? "your admin account" : "your account"} with a second sign-in step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {verified.length > 0 ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              )}
              <CardTitle>Two-Factor Authentication (TOTP)</CardTitle>
            </div>
            <Badge variant={verified.length > 0 ? "default" : "secondary"}>
              {verified.length > 0 ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            Use an authenticator app (1Password, Authy, Google Authenticator) to generate a 6-digit code at sign-in.
            {adminLike && " Strongly recommended for admin accounts."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : verified.length > 0 ? (
            <div className="space-y-2">
              {verified.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{f.friendly_name ?? "Authenticator"}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(f.id)} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : enrolling ? (
            <div className="space-y-4">
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Scan this QR code with your authenticator app.</li>
                <li>Enter the 6-digit code it generates to confirm.</li>
              </ol>
              <div className="flex justify-center rounded-md border bg-white p-4">
                <img src={enrolling.qr} alt="2FA QR code" className="h-48 w-48" />
              </div>
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
                <code className="text-xs font-mono">{enrolling.secret}</code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm & Enable
                </Button>
                <Button variant="outline" onClick={cancelEnroll} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={startEnroll} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable Two-Factor Authentication
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
