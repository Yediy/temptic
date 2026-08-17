import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  modeByKey, optName, sourceByKey,
  type ConstraintEnforcement, type OptimizationRecord, type Strategy,
} from "@/lib/optimization/platform";

/** Enforcement is never presented as an adjustable preference. */
export function EnforcementBadge({ level, locked }: { level: ConstraintEnforcement; locked?: boolean }) {
  const styles: Record<ConstraintEnforcement, string> = {
    HARD: "border-red-500/60 bg-red-500/10 text-red-400",
    SOFT: "border-amber-500/50 bg-amber-500/10 text-amber-400",
    ADVISORY: "border-sky-500/50 bg-sky-500/10 text-sky-400 border-dashed",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", styles[level])}>
      {locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
      {level}
    </span>
  );
}

export function StrategyStatusBadge({ status }: { status: Strategy["status"] }) {
  const map = {
    recommended: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
    alternative: "border-sky-500/50 bg-sky-500/10 text-sky-400",
    rejected: "border-muted-foreground/40 bg-muted text-muted-foreground line-through",
  } as const;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[status])}>
      {status}
    </span>
  );
}

export function ConfidenceBar({ value, threshold = 0.5 }: { value: number | null; threshold?: number }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const low = v < threshold;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", low ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${v * 100}%` }} />
      </div>
      <p className={cn("text-[11px]", low ? "text-amber-500" : "text-muted-foreground")}>
        Confidence {(v * 100).toFixed(0)}%{low ? " — below your threshold" : ""}
      </p>
    </div>
  );
}

export function ObjectiveMeter({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground">{(v * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", v >= 0.7 ? "bg-emerald-500" : v >= 0.4 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  return <Badge variant="outline" className="text-[10px]">{modeByKey(mode).label}</Badge>;
}

export function SourceBadge({ source }: { source: string }) {
  const s = sourceByKey(source);
  return <Badge variant="outline" className="text-[10px]">{s.label}</Badge>;
}

/** Truthful unavailable/degraded state — never replaced with synthetic output. */
export function DegradedState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-md border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-500">{title}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        No values are shown for this panel because the Platform Optimization Engine did not return them.
      </p>
    </div>
  );
}

/** URL-persisted optimization selection, shared across every workspace page. */
export function useSelectedOptId(): [string | undefined, (id: string | undefined) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get("opt") ?? undefined;
  return [
    value,
    (id) => {
      const next = new URLSearchParams(params);
      if (id) next.set("opt", id); else next.delete("opt");
      setParams(next, { replace: true });
    },
  ];
}

export function OptimizationSelect({
  records, value, onChange, label = "Optimization",
}: {
  records: OptimizationRecord[];
  value?: string;
  onChange: (id: string | undefined) => void;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="h-9 min-w-[12rem] max-w-full rounded-md border bg-background px-2 text-sm"
    >
      <option value="">Select an optimization…</option>
      {records.map((r) => (
        <option key={r.id} value={r.id}>{optName(r)}</option>
      ))}
    </select>
  );
}

export function ConstitutionNotice() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 p-2 text-xs text-muted-foreground">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden />
      <p>
        Constitutional, statutory, safety, certification and platform-domain constraints are <strong>HARD</strong>.
        They carry no weighting, penalty or relaxation controls and are always sent to the engine as inviolable.
      </p>
    </div>
  );
}
