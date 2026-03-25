import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = "https://nwyjqphqszonzlulezsq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eWpxcGhxc3pvbnpsdWxlenNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg0OTUsImV4cCI6MjA4OTU5NDQ5NX0.hfKgD7Od9EhORBLR6wAiPMu3pFbYbL26wB1FMd_m0AM";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    setSubmitting(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setStatus("done");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
          <Building2 className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Temp Tic</h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating…</p>
          </div>
        )}

        {status === "valid" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">Are you sure you want to unsubscribe from email notifications?</p>
            <Button onClick={handleUnsubscribe} disabled={submitting} className="w-full">
              {submitting ? "Processing…" : "Confirm Unsubscribe"}
            </Button>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 space-y-2">
            <CheckCircle className="mx-auto h-8 w-8 text-success" />
            <p className="font-medium text-success">You've been unsubscribed.</p>
            <p className="text-sm text-muted-foreground">You will no longer receive email notifications.</p>
          </div>
        )}

        {status === "already" && (
          <div className="rounded-xl border p-6 space-y-2">
            <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Already unsubscribed</p>
            <p className="text-sm text-muted-foreground">You were already removed from the mailing list.</p>
          </div>
        )}

        {(status === "invalid" || status === "error") && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="font-medium text-destructive">
              {status === "invalid" ? "Invalid or expired link" : "Something went wrong"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
