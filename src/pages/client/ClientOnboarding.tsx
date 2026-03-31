import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface InviteData {
  id: string;
  email: string;
  agency_name: string;
  client_company: string;
  signer_first_name: string;
  signer_last_name: string;
}

export default function ClientOnboarding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/client";
  const { refreshUserData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("accept-invite", {
        body: { action: "validate", token },
      });

      let result = data;
      if (fnErr) {
        try {
          const ctx = (fnErr as any).context;
          if (ctx instanceof Response) {
            result = await ctx.json();
          }
        } catch { /* ignore parse errors */ }
      }

      if (!result) {
        setError("Unable to validate invite. Please try again.");
        return;
      }

      if (result.error === "already_accepted") {
        setSuccess("This invite has already been accepted. You can sign in to the client portal.");
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.invite) {
        setInvite(result.invite);
        setForm((f) => ({
          ...f,
          first_name: result.invite.signer_first_name || "",
          last_name: result.invite.signer_last_name || "",
        }));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const buildLoginPath = () => {
    const isDefaultRedirect = redirectPath === "/client";
    return isDefaultRedirect
      ? "/client/login"
      : `/client/login?redirect=${encodeURIComponent(redirectPath)}`;
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("accept-invite", {
        body: {
          action: "accept",
          token,
          email: invite?.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        },
      });

      let result = data;
      if (fnErr) {
        try {
          const ctx = (fnErr as any).context;
          if (ctx instanceof Response) result = await ctx.json();
        } catch { /* ignore */ }
      }
      if (!result || result?.error) {
        setError(result?.error || "Failed to accept invite");
        return;
      }

      // Already-linked signer — just redirect to login
      if (result.already_linked) {
        setSuccess("This signer is already linked to an account.");
        setTimeout(() => navigate(buildLoginPath(), { replace: true }), 2000);
        return;
      }

      // Try auto sign-in for newly created accounts
      if (result.password_provided && result.email) {
        setSigningIn(true);
        try {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: result.email,
            password: form.password,
          });
          if (!signInErr) {
            // Refresh auth context so roles/portal are recognized immediately
            await refreshUserData();
            setSuccess("Account created! Redirecting…");
            // Navigate immediately — no artificial delay
            navigate(redirectPath, { replace: true });
            return;
          }
        } catch {
          // Fall through to manual sign-in
        } finally {
          setSigningIn(false);
        }
      }

      // Existing account or auto sign-in failed — redirect to login
      const isDefaultRedirect = redirectPath === "/client";
      const loginPath = isDefaultRedirect
        ? "/client/login"
        : `/client/login?redirect=${encodeURIComponent(redirectPath)}`;

      setSuccess(
        result.existing_account
          ? "Your account has been linked. Redirecting to sign in…"
          : "Account created! Redirecting to sign in…"
      );
      setTimeout(() => navigate(buildLoginPath(), { replace: true }), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Temp Tic</h1>
          <p className="mt-1 text-sm text-muted-foreground">Client Portal — Accept Invitation</p>
        </div>

        {(loading || signingIn) && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {signingIn ? "Signing you in…" : "Validating your invite…"}
            </p>
          </div>
        )}

        {!loading && !signingIn && error && !invite && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate(buildLoginPath())}>
              Go to Login
            </Button>
          </div>
        )}

        {!loading && !signingIn && success && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center space-y-3">
            <CheckCircle className="mx-auto h-8 w-8 text-success" />
            <p className="font-medium text-success">{success}</p>
            <Button onClick={() => navigate(buildLoginPath())}>
              Sign In to Portal
            </Button>
          </div>
        )}

        {!loading && !signingIn && invite && !success && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <p className="text-sm">
                You've been invited to sign tickets for{" "}
                <span className="font-bold">{invite.client_company}</span> through{" "}
                <span className="font-bold">{invite.agency_name}</span>.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Signing as:</span>
                <span className="font-medium text-foreground">
                  {invite.signer_first_name} {invite.signer_last_name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Email:</span>
                <span className="font-medium text-foreground">{invite.email}</span>
              </div>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Create Password</Label>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="mt-1"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <Label>Confirm Password</Label>
                <PasswordInput
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  required
                  className="mt-1"
                  placeholder="Confirm your password"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating Account…" : "Accept Invite & Create Account"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <a href={buildLoginPath()} className="text-primary hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
