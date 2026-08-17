import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { modeByKey, simName, type ProjectionKind, type SimulationRecord } from "@/lib/simulation/platform";

/** Explicit, never-ambiguous separation between real and simulated state. */
export function ProjectionBadge({ kind, className }: { kind: ProjectionKind; className?: string }) {
  const styles: Record<ProjectionKind, string> = {
    ACTUAL: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
    PROJECTED: "border-sky-500/50 bg-sky-500/10 text-sky-400 border-dashed",
    COUNTERFACTUAL: "border-amber-500/50 bg-amber-500/10 text-amber-400 border-dashed",
    SIMULATED: "border-violet-500/50 bg-violet-500/10 text-violet-400 border-dashed",
  };
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", styles[kind], className)}>
      {kind}
    </span>
  );
}

export function ConfidenceBar({ value, threshold = 0.5 }: { value: number | null; threshold?: number }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const low = v < threshold;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-primary")}
          style={{ width: `${v * 100}%` }}
        />
      </div>
      <p className={cn("text-[11px]", low ? "text-destructive" : "text-muted-foreground")}>
        Confidence {(v * 100).toFixed(0)}%{low ? " · below threshold" : ""}
      </p>
    </div>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  return <Badge variant="secondary" className="text-[10px]">{modeByKey(mode).label}</Badge>;
}

/** Shared selection across the whole workspace via ?sim=<id>. */
export function useSelectedSimId(): [string | undefined, (id: string | undefined) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get("sim") ?? undefined;
  const set = (id: string | undefined) => {
    const next = new URLSearchParams(params);
    if (id) next.set("sim", id); else next.delete("sim");
    setParams(next, { replace: true });
  };
  return [value, set];
}

export function SimulationSelect({
  records, value, onChange, label = "Simulation",
}: {
  records: SimulationRecord[];
  value?: string;
  onChange: (id: string | undefined) => void;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
    >
      <option value="">Select a simulation…</option>
      {records.map((r) => (
        <option key={r.id} value={r.id}>
          {simName(r)} · {new Date(r.created_at).toLocaleDateString()}
        </option>
      ))}
    </select>
  );
}

export function SimulationBanner() {
  return (
    <div className="rounded-md border border-dashed border-sky-500/40 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
      Simulation space — every value below is a projection. Nothing here changes production state,
      executes a decision, or activates an automation.
    </div>
  );
}
