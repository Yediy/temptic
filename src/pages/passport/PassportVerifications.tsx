import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVerifications } from "@/hooks/passport/use-workforce-passport";
import { VERIFICATION_TYPES } from "@/lib/passport/types";
import { LoadingState } from "@/components/woic/AsyncState";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  verified: "default",
  pending: "secondary",
  failed: "destructive",
  expired: "destructive",
  unverified: "outline",
};

export default function PassportVerifications() {
  const { passportId } = useParams();
  const { data, isLoading } = useVerifications(passportId);
  if (isLoading) return <LoadingState />;

  const byType = new Map((data ?? []).map((v) => [v.verification_type, v]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Verifications</CardTitle>
        <p className="text-xs text-muted-foreground">
          Granular verification records issued by trusted verifiers. Managed by IWOS agents.
        </p>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {VERIFICATION_TYPES.map((t) => {
          const v = byType.get(t.key);
          const status = v?.status ?? "unverified";
          return (
            <div key={t.key} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">
                  {v?.verifier ? `Verifier: ${v.verifier}` : "No verifier on record"}
                  {v?.verified_at && ` · Verified ${new Date(v.verified_at).toLocaleDateString()}`}
                  {v?.expires_at && ` · Expires ${new Date(v.expires_at).toLocaleDateString()}`}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
