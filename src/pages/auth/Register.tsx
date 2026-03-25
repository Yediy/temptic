import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { FileText, ArrowRight } from "lucide-react";

export default function Register() {
  const { signUp, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", agency_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign up and get session directly
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { first_name: form.first_name, last_name: form.last_name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      // If email confirmation is required, session may be null
      if (!signUpData.session) {
        // Try signing in immediately (works when email confirm is disabled)
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInErr) {
          setError("Account created! Please check your email to confirm, then sign in.");
          setLoading(false);
          return;
        }
      }

      // Now session is active, call register_agency RPC
      const { error: rpcErr } = await supabase.rpc("register_agency", {
        _agency_name: form.agency_name,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }

      // Re-fetch roles so AuthProvider picks up the new agency_admin role
      await refreshUserData();

      setLoading(false);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Agency Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start managing labor tickets digitally</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="agency_name">Agency Name</Label>
            <Input id="agency_name" value={form.agency_name} onChange={e => setForm({ ...form, agency_name: e.target.value })} required className="mt-1" placeholder="ProStaff Industrial" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} className="mt-1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
