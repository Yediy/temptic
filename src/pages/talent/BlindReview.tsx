import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EyeOff } from "lucide-react";

interface BlindRow {
  worker_id: string;
  years_experience: number | null;
  general_location: string | null;
  travel_radius_miles: number | null;
  trade_specialties: string[] | null;
  preferred_industries: string[] | null;
  desired_pay_min: number | null;
  desired_pay_max: number | null;
  completion_score: number | null;
  verified_credential_count: number | null;
  certificate_count: number | null;
}

export default function BlindReview() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["blind-candidates", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<BlindRow[]> => {
      const { data, error } = await supabase
        .from("blind_candidate_view")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*" as any)
        .eq("agency_id", agencyId!)
        .order("completion_score", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as BlindRow[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <EyeOff className="h-5 w-5" /> Blind Review
        </h1>
        <p className="text-sm text-muted-foreground">
          Candidates shown without name, photo, or identifying details to reduce bias. Enforced at the database layer.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading candidates…</div>}
      {error && <div className="text-sm text-destructive">Failed to load: {String(error)}</div>}
      {!isLoading && !error && data?.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No candidates in the blind pool yet. Onboard workers with completed profiles to populate this view.
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((c) => (
          <Card key={c.worker_id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Candidate #{c.worker_id.slice(0, 8)}</div>
              {typeof c.completion_score === "number" && (
                <Badge variant="secondary">{c.completion_score}% complete</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {c.general_location && <div>Location: {c.general_location}</div>}
              {typeof c.years_experience === "number" && <div>Experience: {c.years_experience} yrs</div>}
              {typeof c.travel_radius_miles === "number" && <div>Travel radius: {c.travel_radius_miles} mi</div>}
              {c.desired_pay_min != null && (
                <div>Pay range: ${c.desired_pay_min}{c.desired_pay_max ? `–$${c.desired_pay_max}` : "+"}</div>
              )}
            </div>
            {c.trade_specialties && c.trade_specialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.trade_specialties.slice(0, 5).map((t) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {c.verified_credential_count ?? 0} verified credentials · {c.certificate_count ?? 0} certificates
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
