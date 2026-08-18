import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

type SharedResponse = {
  passport_id: string;
  label: string | null;
  access: { scopes: string[]; use: number; max_uses: number; one_time: boolean; expires_at: string | null; consumed: boolean };
  generated_at: string;
  data: Record<string, any>;
};

export default function PassportSharedView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [payload, setPayload] = useState<SharedResponse | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke("passport-share-view", { body: { token } });
      if (!active) return;
      if (error || !data || data.error) {
        setMessage(data?.error ?? "This share link is no longer valid.");
        setState("error");
        return;
      }
      setPayload(data as SharedResponse);
      setState("ok");
    })();
    return () => { active = false; };
  }, [token]);

  if (state === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Verifying share link…</div>
      </div>
    );
  }

  if (state === "error" || !payload) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Link unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {message} Share links expire, can be revoked by their owner, and one-time links stop working after a single view.
          </CardContent>
        </Card>
      </div>
    );
  }

  const identity = payload.data.identity;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {identity?.display_name ?? "Workforce Passport"}
              </span>
              <Badge variant="secondary">Verified data only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>
              View {payload.access.use} of {payload.access.max_uses}
              {payload.access.consumed ? " · this link is now closed" : ""}
              {payload.access.expires_at ? ` · expires ${new Date(payload.access.expires_at).toLocaleString()}` : ""}
            </div>
            <div>Shared sections: {payload.access.scopes.join(", ")}</div>
            <div>This access has been logged for the passport owner.</div>
          </CardContent>
        </Card>

        {Object.entries(payload.data).map(([key, value]) => (
          <Card key={key}>
            <CardHeader><CardTitle className="text-sm capitalize">{key.replace(/_/g, " ")}</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(value, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
