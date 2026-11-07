import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, CheckCircle2, XCircle, AlertTriangle, ChevronDown, RefreshCw } from "lucide-react";

export type TicketReview = {
  id: string;
  recommendation: "sign" | "reject" | "review";
  confidence: number;
  summary: string;
  reasoning_steps: { kind: string; content: string; confidence?: number }[];
  evidence: { source: string; detail: string }[];
  risks: string[];
  alternatives: { option: string; rationale: string; confidence?: number }[];
  checks: { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }[];
  suggested_rejection_reason: string | null;
  final_decision: string | null;
  followed: boolean | null;
  created_at: string;
};

const REC = {
  sign: { label: "Recommend: Sign", icon: CheckCircle2, variant: "default" as const },
  reject: { label: "Recommend: Reject", icon: XCircle, variant: "destructive" as const },
  review: { label: "Needs your review", icon: AlertTriangle, variant: "secondary" as const },
};

export default function WoicTicketReview({ ticketId, canAct, onReview, onUseReason }: {
  ticketId: string;
  canAct: boolean;
  onReview?: (r: TicketReview | null) => void;
  onUseReason?: (reason: string) => void;
}) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey: ["woic-ticket-review", ticketId],
    enabled: canAct,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<TicketReview> => {
      const { data, error } = await supabase.functions.invoke("woic-ticket-review", { body: { ticket_id: ticketId } });
      if (error) throw error;
      return (data as { review: TicketReview }).review;
    },
  });

  // Read-only history (after a decision) without calling WOIC again.
  const past = useQuery({
    queryKey: ["woic-ticket-review-history", ticketId],
    enabled: !canAct,
    queryFn: async (): Promise<TicketReview | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)("ticket_ai_reviews").select("*").eq("ticket_id", ticketId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data ?? null;
    },
  });

  const review = canAct ? q.data : past.data;
  useEffect(() => { onReview?.(review ?? null); }, [review, onReview]);

  async function refresh() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("woic-ticket-review", { body: { ticket_id: ticketId, refresh: true } });
      if (!error) qc.setQueryData(["woic-ticket-review", ticketId], (data as { review: TicketReview }).review);
    } finally { setRefreshing(false); }
  }

  if (!canAct && !review) return null;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Brain className="h-4 w-4" />WOIC review</h3>
        {canAct && review && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />Re-run
          </Button>
        )}
      </div>

      {canAct && q.isLoading && <p className="text-sm text-muted-foreground">WOIC is checking this ticket…</p>}
      {canAct && q.error && (
        <p className="text-sm text-muted-foreground">WOIC couldn't review this ticket right now. You can still sign or reject it yourself.</p>
      )}

      {review && (() => {
        const meta = REC[review.recommendation];
        const Icon = meta.icon;
        return (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant} className="gap-1"><Icon className="h-3.5 w-3.5" />{meta.label}</Badge>
              <span className="text-xs text-muted-foreground">{Math.round(review.confidence * 100)}% confidence</span>
              {review.final_decision && (
                <Badge variant="outline">
                  Client {review.final_decision} · {review.followed === null ? "no recommendation" : review.followed ? "followed WOIC" : "overrode WOIC"}
                </Badge>
              )}
            </div>
            <p className="text-sm">{review.summary}</p>

            <div className="grid gap-1.5">
              {review.checks.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  {c.status === "pass" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    : c.status === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                  <span><span className="font-medium">{c.label}</span> — <span className="text-muted-foreground">{c.detail}</span></span>
                </div>
              ))}
            </div>

            {canAct && review.recommendation !== "sign" && review.suggested_rejection_reason && onUseReason && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30"
                onClick={() => onUseReason(review.suggested_rejection_reason!)}>
                <XCircle className="mr-1 h-4 w-4" />Reject with WOIC's suggested reason
              </Button>
            )}

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5" />Why? Full reasoning, evidence and risks
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Reasoning</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    {review.reasoning_steps.map((st, i) => (
                      <li key={i}><span className="text-xs uppercase text-muted-foreground">{st.kind}</span> — {st.content}</li>
                    ))}
                  </ol>
                </div>
                {review.evidence.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Evidence</p>
                    <ul className="space-y-1">{review.evidence.map((e, i) => <li key={i}><Badge variant="outline" className="mr-1">{e.source}</Badge>{e.detail}</li>)}</ul>
                  </div>
                )}
                {review.risks.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Risks of following this recommendation</p>
                    <ul className="list-disc pl-5">{review.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}
                {review.alternatives.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Alternatives considered</p>
                    <ul className="space-y-1">{review.alternatives.map((a, i) => <li key={i}><span className="font-medium">{a.option}</span> — {a.rationale}</li>)}</ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Reviewed {new Date(review.created_at).toLocaleString()}. WOIC only recommends — your signature or rejection is the decision.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        );
      })()}
    </div>
  );
}
