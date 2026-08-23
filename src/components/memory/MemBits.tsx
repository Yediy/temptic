// Shared presentation primitives for the WOIC Cognitive Memory Workspace (PC-6.2B).
// Rendering only — no working-memory logic, compression, eviction, scoring,
// checkpoint persistence, state merging or promotion.
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ARCHITECTURE_VERSION, CAPABILITY_SPEC, CHECKPOINT_STYLES, GOAL_STYLES, HYPOTHESIS_STYLES,
  LIFECYCLE_DISPOSITION, LIFECYCLE_MEANING, LIFECYCLE_STATES, LIFECYCLE_STYLES,
  PLATFORM_CONTRACT, PLATFORM_DNA, RETENTION_STYLES, SESSION_STYLES,
  normalizeCheckpoint, normalizeGoal, normalizeHypothesis, normalizeLifecycle,
  normalizeRetention, normalizeSession, num, scorePercent, str,
} from "@/lib/memory/platform";
import type { CapabilityStatus } from "@/hooks/memory/use-memory";

// Reused verbatim from the Cognitive Control Workspace design system.
export {
  Panel, Metric, RecordTable, ListControls, Pager, usePagedRows, MetadataBlock, ConfidenceMeter,
} from "@/components/cognition/CogBits";

/* --------------------------------------------------------------- indicators */

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", className)}>
      {children}
    </span>
  );
}

export function SessionStateBadge({ value }: { value: unknown }) {
  const s = normalizeSession(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={SESSION_STYLES[s]}>{s}</Chip>;
}

export function LifecycleBadge({ value }: { value: unknown }) {
  const s = normalizeLifecycle(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  const disposition = LIFECYCLE_DISPOSITION[s];
  return (
    <span className="inline-flex items-center gap-1" title={LIFECYCLE_MEANING[s]}>
      <Chip className={LIFECYCLE_STYLES[s]}>{s}</Chip>
      {disposition === "removed" && <span className="text-[10px] text-red-400">removed</span>}
      {disposition === "preserved" && <span className="text-[10px] text-cyan-300">preserved</span>}
    </span>
  );
}

export function GoalStateBadge({ value }: { value: unknown }) {
  const s = normalizeGoal(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={GOAL_STYLES[s]}>{s}</Chip>;
}

export function HypothesisBadge({ value }: { value: unknown }) {
  const s = normalizeHypothesis(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={HYPOTHESIS_STYLES[s]}>{s}</Chip>;
}

export function CheckpointBadge({ value }: { value: unknown }) {
  const s = normalizeCheckpoint(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={CHECKPOINT_STYLES[s]}>{s}</Chip>;
}

export function RetentionBadge({ value }: { value: unknown }) {
  const s = normalizeRetention(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={RETENTION_STYLES[s]}>{s}</Chip>;
}

/** Utilization / pressure meter. Rendered only when the backend reported a value. */
export function UtilizationMeter({ value, label = "Utilization" }: { value: unknown; label?: string }) {
  const pct = scorePercent(value);
  if (pct == null) {
    return (
      <span className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
        UNSTATED
      </span>
    );
  }
  const tone = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: ${pct}%`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

/** One budget dimension: used / limit with an explicit threshold warning. */
export function BudgetBar({
  label, detail, budget,
}: {
  label: string;
  detail?: string;
  budget: Record<string, unknown> | undefined;
}) {
  const rec = budget ?? {};
  const used = num(rec.used ?? rec.consumed ?? rec.spent);
  const limit = num(rec.limit ?? rec.allocated ?? rec.total ?? rec.budget);
  const reportedPct = scorePercent(rec.utilization ?? rec.percent);
  const pct = reportedPct ?? (used != null && limit != null && limit > 0 ? Math.round((used / limit) * 100) : null);
  const threshold = scorePercent(rec.warning_threshold) ?? 80;
  const over = pct != null && pct >= threshold;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{label}</p>
          {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
        </div>
        {over && (
          <span className="shrink-0 rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
            THRESHOLD {threshold}%
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm tabular-nums">
          {used == null && limit == null ? "—" : `${used == null ? "—" : used}${limit == null ? "" : ` / ${limit}`}`}
        </span>
        <UtilizationMeter value={pct} label={label} />
      </div>
      {rec.unit != null && <p className="mt-1 text-[10px] text-muted-foreground">Unit: {str(rec.unit)}</p>}
    </div>
  );
}

/** Structural depiction of the working-memory lifecycle. Not a computation. */
export function LifecycleFlow({
  counts, selected, onSelect,
}: {
  counts?: Record<string, unknown>;
  selected?: string | null;
  onSelect?: (state: string) => void;
}) {
  const rec = counts ?? {};
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
      {LIFECYCLE_STATES.map((state) => {
        const raw = rec[state.toLowerCase()] ?? rec[state];
        const disposition = LIFECYCLE_DISPOSITION[state];
        return (
          <li key={state}>
            <button
              type="button"
              onClick={() => onSelect?.(state)}
              aria-pressed={selected === state}
              className={cn(
                "w-full rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                selected === state && "ring-1 ring-primary",
                raw == null && "border-dashed text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <LifecycleBadge value={state} />
                <span className="text-sm tabular-nums">{raw == null ? "—" : str(raw)}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{LIFECYCLE_MEANING[state]}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {disposition === "removed" ? "deletion" : disposition === "preserved" ? "promotion — retained elsewhere" : "in memory"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------- truthful states */

export function CapabilityState({
  status, message, label, children,
}: {
  status: CapabilityStatus;
  message?: string | null;
  label: string;
  children?: React.ReactNode;
}) {
  if (status === "ok") return <>{children}</>;
  if (status === "loading") {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading {label}…</div>;
  }
  if (status === "idle") {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No organization context.</div>;
  }
  if (status === "forbidden") {
    return (
      <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
        <p className="font-semibold text-red-400">NOT AUTHORIZED</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your identity is not permitted to view {label}. {message}
        </p>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="rounded-md border border-dashed border-amber-500/60 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold tracking-wide text-amber-400">BACKEND CAPABILITY PENDING</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {label} is served by the Phase 6.2A Working Memory API, which is not available in this environment.
          Nothing is shown because no memory state has been reported — this workspace holds no local working
          memory and never manufactures items, budgets or checkpoints.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">API reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">WORKING MEMORY API ERROR</p>
      <p className="mt-1 text-xs text-muted-foreground">{message ?? `${label} could not be loaded.`}</p>
    </div>
  );
}

export function ContractChips() {
  return (
    <div className="flex flex-wrap gap-1">
      {[PLATFORM_CONTRACT, CAPABILITY_SPEC, PLATFORM_DNA, ARCHITECTURE_VERSION].map((c) => (
        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
      ))}
    </div>
  );
}

export function PrivacyNotice() {
  return (
    <p className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
      Operational memory metadata only. Private model reasoning is never stored, transmitted or reconstructed
      here. Compression summaries are the structured artifacts WOIC produced — not hidden chain-of-thought.
    </p>
  );
}

export function ArchitectureLinks() {
  const links = [
    { to: "/architecture/contracts", label: "Contract" },
    { to: "/architecture/capspecs", label: "CapSpec" },
    { to: "/architecture/dna", label: "Platform DNA" },
    { to: "/architecture/dependencies", label: "Dependencies" },
    { to: "/architecture/health", label: "Structural Health" },
    { to: "/cognition", label: "Cognitive Control" },
    { to: "/perception", label: "Perception & Context" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {links.map((l, i) => (
        <span key={l.to} className="flex items-center gap-1">
          <Link to={l.to} className="text-primary hover:underline">{l.label}</Link>
          {i < links.length - 1 && <span aria-hidden className="text-muted-foreground">/</span>}
        </span>
      ))}
    </div>
  );
}
