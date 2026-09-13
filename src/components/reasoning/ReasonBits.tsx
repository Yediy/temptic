// Shared presentation primitives for the WOIC Reasoning & Evidence Workspace (PC-6.3B).
// Rendering only — no reasoning, no conclusion derivation, no confidence
// scoring, no evidence weighting, no causal inference.
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ARCHITECTURE_VERSION, CAPABILITY_SPEC, CAUSAL_MEANING, CAUSAL_STYLES, CONCLUSION_STYLES,
  EVIDENCE_STYLES, HYPOTHESIS_STYLES, PLATFORM_CONTRACT, PLATFORM_DNA, REQUEST_STYLES,
  RESOLUTION_STYLES, normalizeCausal, normalizeConclusion, normalizeHypothesis, normalizeMode,
  normalizeRequestState, normalizeResolution, normalizeStance, scorePercent, str,
} from "@/lib/reasoning/platform";
import type { CapabilityStatus } from "@/hooks/reasoning/use-reasoning";

// Reused verbatim from the Cognitive Control Workspace design system.
export {
  Panel, Metric, RecordTable, ListControls, Pager, usePagedRows, MetadataBlock,
} from "@/components/cognition/CogBits";

/* --------------------------------------------------------------- indicators */

function Chip({ className, children, title }: { className: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", className)}>
      {children}
    </span>
  );
}

export function RequestStateBadge({ value }: { value: unknown }) {
  const s = normalizeRequestState(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={REQUEST_STYLES[s]}>{s.replace(/_/g, " ")}</Chip>;
}

export function ConclusionStatusBadge({ value }: { value: unknown }) {
  const s = normalizeConclusion(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={CONCLUSION_STYLES[s]}>{s.replace(/_/g, " ")}</Chip>;
}

export function StanceBadge({ value }: { value: unknown }) {
  const s = normalizeStance(value) ?? "UNCLASSIFIED";
  return <Chip className={EVIDENCE_STYLES[s]}>{s}</Chip>;
}

export function ResolutionBadge({ value }: { value: unknown }) {
  const s = normalizeResolution(value);
  if (!s) return <Chip className={RESOLUTION_STYLES.UNRESOLVED}>UNRESOLVED</Chip>;
  return <Chip className={RESOLUTION_STYLES[s]}>{s.replace(/_/g, " ")}</Chip>;
}

export function HypothesisStatusBadge({ value }: { value: unknown }) {
  const s = normalizeHypothesis(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNREPORTED</span>;
  return <Chip className={HYPOTHESIS_STYLES[s]}>{s.replace(/_/g, " ")}</Chip>;
}

/** Causal classification is assigned by 6.3A and always shown verbatim. */
export function CausalBadge({ value }: { value: unknown }) {
  const s = normalizeCausal(value) ?? "UNDETERMINED";
  return <Chip className={CAUSAL_STYLES[s]} title={CAUSAL_MEANING[s]}>{s.replace(/_/g, " ")}</Chip>;
}

export function ModeChips({ value }: { value: unknown }) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  if (!list.length) return <span className="text-xs text-muted-foreground">NOT REPORTED</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((m, i) => {
        const norm = normalizeMode(typeof m === "object" ? (m as Record<string, unknown>).mode : m);
        return (
          <Chip key={i} className="border-primary/40 bg-primary/5 text-primary">
            {norm ?? str(typeof m === "object" ? (m as Record<string, unknown>).mode ?? m : m)}
          </Chip>
        );
      })}
    </span>
  );
}

/**
 * Confidence is rendered only when the backend reported it. A conclusion with
 * no stated confidence is shown as UNSTATED, never as a fabricated number.
 */
export function ConfidenceMeter({ value, label = "Confidence" }: { value: unknown; label?: string }) {
  const pct = scorePercent(value);
  if (pct == null) {
    return (
      <span className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
        CONFIDENCE UNSTATED
      </span>
    );
  }
  const tone = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: ${pct}% (reported by WOIC)`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

export function CoverageMeter({ value, label = "Evidence coverage" }: { value: unknown; label?: string }) {
  const pct = scorePercent(value);
  if (pct == null) return <span className="text-xs text-muted-foreground">COVERAGE UNSTATED</span>;
  const tone = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: ${pct}%`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

/** Uncertainty is a first-class result, not an error. */
export function UncertaintyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-sky-500/40 bg-sky-500/5 p-2 text-xs text-sky-200">
      <span className="mr-1 font-semibold tracking-wide">UNCERTAINTY RETAINED</span>
      {children}
    </p>
  );
}

/**
 * Insufficient evidence is a legitimate outcome. It is presented as a
 * structured state, never as a system failure banner.
 */
export function InsufficientEvidenceState({
  cannotConclude, missing, why, sources, impact,
}: {
  cannotConclude?: unknown;
  missing?: unknown;
  why?: unknown;
  sources?: unknown;
  impact?: unknown;
}) {
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(typeof x === "object" ? (x as Record<string, unknown>).label ?? (x as Record<string, unknown>).name ?? x : x)) : v == null ? [] : [str(v)]);
  const blocks: Array<[string, string[]]> = [
    ["What cannot be concluded", list(cannotConclude)],
    ["What evidence is missing", list(missing)],
    ["Why current evidence is insufficient", list(why)],
    ["Suggested information sources", list(sources)],
    ["Impact on decision", list(impact)],
  ];
  return (
    <div className="rounded-md border border-sky-500/40 bg-sky-500/5 p-3">
      <p className="text-xs font-semibold tracking-wide text-sky-300">INSUFFICIENT EVIDENCE</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        WOIC declined to conclude. This is a valid reasoning result, not a failure.
      </p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {blocks.map(([label, values]) => (
          <div key={label} className="rounded border bg-background/40 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm">
              {values.length
                ? <ul className="list-disc pl-4">{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
                : <span className="text-muted-foreground">Not reported.</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------- capability */

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
          {label} is served by the Phase 6.3A Reasoning API, which is not available in this environment.
          Nothing is shown because no reasoning has been reported — this workspace never manufactures
          conclusions, confidence or evidence.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">API reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">REASONING API ERROR</p>
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
      Conclusions, evidence and operational metadata only. Private model reasoning (chain-of-thought) is never
      stored, transmitted or reconstructed by this workspace, and no conclusion or confidence value shown here
      is computed in the browser.
    </p>
  );
}

export function ArchitectureLinks() {
  const links = [
    { to: "/architecture/dna", label: "Platform DNA" },
    { to: "/architecture/contracts", label: "Contract" },
    { to: "/architecture/apis", label: "API Catalog" },
    { to: "/architecture/permissions", label: "Permission Map" },
    { to: "/cognition", label: "Cognitive Control" },
    { to: "/memory", label: "Working Memory" },
    { to: "/perception", label: "Perception & Context" },
  ];
  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="rounded border px-2 py-1 text-primary hover:bg-muted/50">{l.label}</Link>
        </li>
      ))}
    </ul>
  );
}

/** Two-column comparison used for critical review and model disagreement. */
export function CompareColumns({
  left, right, leftLabel, rightLabel,
}: { left: React.ReactNode; right: React.ReactNode; leftLabel: string; rightLabel: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-md border bg-muted/20 p-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{leftLabel}</p>
        {left}
      </div>
      <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{rightLabel}</p>
        {right}
      </div>
    </div>
  );
}
