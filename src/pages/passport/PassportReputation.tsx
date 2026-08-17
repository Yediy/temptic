import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LoadingState } from "@/components/woic/AsyncState";
import { usePassport } from "@/hooks/passport/use-workforce-passport";
import {
  REPUTATION_CATEGORIES,
  useDisputeReputation,
  useRecomputeReputation,
  useReputation,
} from "@/hooks/passport/use-passport-reputation";

function scoreTone(score: number) {
  if (score >= 4.25) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  if (score > 0) return "text-rose-600";
  return "text-muted-foreground";
}

export default function PassportReputation() {
  const { passportId } = useParams();
  const { data: passport } = usePassport(passportId);
  const { data: rows, isLoading } = useReputation(passportId);
  const recompute = useRecomputeReputation(passportId);
  const dispute = useDisputeReputation(passportId);
  const [openDispute, setOpenDispute] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const byCategory = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows ?? []) map.set(r.category, r);
    return map;
  }, [rows]);

  const overall = useMemo(() => {
    let acc = 0;
    let w = 0;
    for (const c of REPUTATION_CATEGORIES) {
      const row = byCategory.get(c.key);
      if (!row || row.disputed) continue;
      acc += Number(row.score) * c.weight;
      w += c.weight;
    }
    return w ? Number((acc / w).toFixed(2)) : Number(passport?.reputation_score ?? 0);
  }, [byCategory, passport]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-sm">Reputation Score</CardTitle>
            <p className="text-xs text-muted-foreground">
              Weighted across attendance, reliability, performance, safety, professionalism,
              client feedback and completion signals.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              recompute.mutate(undefined, {
                onSuccess: (d) => toast.success(`Reputation recomputed: ${d?.overall_score ?? overall}/5`),
                onError: (e: any) => toast.error(e?.message ?? "Recompute failed"),
              })
            }
            disabled={recompute.isPending}
          >
            {recompute.isPending ? "Computing…" : "Recompute"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold ${scoreTone(overall)}`}>
            {overall.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">/5</span>
          </div>
          <Progress value={(overall / 5) * 100} className="mt-3" />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {REPUTATION_CATEGORIES.map((c) => {
          const row = byCategory.get(c.key);
          const score = Number(row?.score ?? 0);
          const meta = (row?.metadata ?? {}) as Record<string, unknown>;
          return (
            <Card key={c.key} className={row?.disputed ? "border-amber-500/60" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      weight {Math.round(c.weight * 100)}%
                    </Badge>
                    <span className={`text-lg font-semibold ${scoreTone(score)}`}>{score.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Progress value={(score / 5) * 100} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>Sample: {row?.sample_size ?? 0}</span>
                  {row?.source && <span>Source: {row.source}</span>}
                  {row?.last_computed_at && (
                    <span>Updated {new Date(row.last_computed_at).toLocaleDateString()}</span>
                  )}
                </div>
                {Object.keys(meta).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(meta).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-[10px] font-normal">
                        {k.replace(/_/g, " ")}: {String(v)}
                      </Badge>
                    ))}
                  </div>
                )}
                {row?.disputed && (
                  <p className="text-amber-600">
                    Disputed{row.dispute_reason ? `: ${row.dispute_reason}` : ""} — excluded from the overall score.
                  </p>
                )}
                {row && (
                  <div className="pt-1">
                    {row.disputed ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dispute.mutate({ id: row.id, disputed: false })}
                      >
                        Withdraw dispute
                      </Button>
                    ) : openDispute === row.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Why is this score inaccurate?"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              dispute.mutate(
                                { id: row.id, disputed: true, reason },
                                {
                                  onSuccess: () => {
                                    toast.success("Dispute flagged for review");
                                    setOpenDispute(null);
                                    setReason("");
                                  },
                                  onError: (e: any) => toast.error(e?.message ?? "Could not flag dispute"),
                                },
                              )
                            }
                          >
                            Submit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setOpenDispute(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setOpenDispute(row.id); setReason(""); }}>
                        Dispute score
                      </Button>
                    )}
                  </div>
                )}
                {!row && <p className="text-muted-foreground">Not computed yet — run Recompute.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
