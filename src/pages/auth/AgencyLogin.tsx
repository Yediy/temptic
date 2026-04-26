import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { FileText, ArrowRight, Sparkles } from "lucide-react";

export default function AgencyLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate("/");
    }
  };

  const handleDemo = async () => {
    setError("");
    setDemoLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("demo-login");
      if (fnError || !data?.access_token) {
        setError(data?.error ?? fnError?.message ?? "Demo unavailable. Try again shortly.");
        setDemoLoading(false);
        return;
      }
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionErr) {
        setError(sessionErr.message);
        setDemoLoading(false);
        return;
      }
      navigate("/");
    } catch (e) {
      setError((e as Error).message ?? "Demo unavailable.");
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Temp Tic</h1>
          <p className="mt-1 text-sm text-muted-foreground">Agency Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1" placeholder="dispatch@agency.com" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
            <PasswordInput id="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleDemo}
          disabled={demoLoading}
        >
          <Sparkles className="mr-2 h-4 w-4 text-accent" />
          {demoLoading ? "Loading demo…" : "Try Live Demo"}
        </Button>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Don't have an account? <Link to="/register" className="font-medium text-primary hover:underline">Register</Link></p>
          <div className="flex justify-center gap-4 pt-2">
            <Link to="/client/login" className="text-xs hover:text-foreground transition-colors">Client Portal →</Link>
            <Link to="/worker/login" className="text-xs hover:text-foreground transition-colors">Worker Portal →</Link>
          </div>
        </div>

        <footer className="pt-6 text-center text-[11px] text-muted-foreground">
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/help" className="hover:text-foreground">Help</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
