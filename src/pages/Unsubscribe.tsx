import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://nwyjqphqszonzlulezsq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eWpxcGhxc3pvbnpsdWxlenNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg0OTUsImV4cCI6MjA4OTU5NDQ5NX0.hfKgD7Od9EhORBLR6wAiPMu3pFbYbL26wB1FMd_m0AM";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center space-y-4">
        <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">Temp Tic</h1>
        {status === "loading" && <p className="text-muted-foreground">Loading…</p>}
        {status === "valid" && (
          <>
            <p className="text-sm text-muted-foreground">Are you sure you want to unsubscribe from email notifications?</p>
            <button onClick={handleConfirm} className="w-full rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:opacity-90 transition">
              Confirm Unsubscribe
            </button>
          </>
        )}
        {status === "success" && <p className="text-sm text-success font-medium">You have been unsubscribed successfully.</p>}
        {status === "already" && <p className="text-sm text-muted-foreground">You are already unsubscribed.</p>}
        {status === "invalid" && <p className="text-sm text-destructive">Invalid or expired unsubscribe link.</p>}
        {status === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again later.</p>}
      </div>
    </div>
  );
}
