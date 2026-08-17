// Shared presentation primitives for the WOIC Cognitive Control Workspace (PC-6.0B).
// Rendering only — no cognition, no scoring, no inference.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CAPABILITY_SPEC, CLAIM_STATE_STYLES, COGNITIVE_FLOW_STAGES, FACULTY_STATUS_STYLES,
  PLATFORM_CONTRACT, PLATFORM_DNA, ARCHITECTURE_VERSION, CONSTITUTION_VERSION,
  REQUEST_STATE_STYLES, RISK_STYLES, confidencePercent, isForbiddenKey,
  normalizeClaimState, normalizeFacultyStatus, normalizeRequestState, normalizeRisk, str,
} from "@/lib/cognition/platform";
import type { CapabilityStatus } from "@/hooks/cognition/use-cognition";

/* --------------------------------------------------------------- indicators */

export function RequestStateBadge({ state }: { state: unknown }) {
  const s = normalizeRequestState(state);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", REQUEST_STATE_STYLES[s])}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

export function ClaimStateBadge({ state }: { state: unknown }) {
  const s = normalizeClaimState(state);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", CLAIM_STATE_STYLES[s])}>
      {s}
    </span>
  );
}

export function FacultyStatusBadge({ status }: { status: unknown }) {
  const s = normalizeFacultyStatus(status);
  if (!s) return <span className="text-xs text-muted-foreground">UNKNOWN</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", FACULTY_STATUS_STYLES[s])}>
      {s}
      {s === "PLANNED" && <span className="ml-1 font-normal opacity-80">not operational</span>}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: unknown }) {
  const r = normalizeRisk(risk);
  if (!r) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", RISK_STYLES[r])}>{r}</span>
  );
}

/**
 * Confidence is rendered only when the backend reported it. An operation that
 * declared no confidence is shown as UNSTATED, never as a fabricated number.
 */
export function ConfidenceMeter({ value, label = "Confidence" }: { value: unknown; label?: string }) {
  const pct = confidencePercent(value);
  if (pct == null) {
    return (
      <span className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
        CONFIDENCE UNSTATED
      </span>
    );
  }
  const tone = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: ${pct}%`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

export function UncertaintyFlag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
      ⚠ {children}
    </span>
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
          {label} is served by the Phase 6.0A Cognitive Control API, which is not available in this environment.
          Nothing is shown because no cognitive activity has been reported — this workspace never manufactures it.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">API reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">COGNITIVE CONTROL API ERROR</p>
      <p className="mt-1 text-xs text-muted-foreground">{message ?? `${label} could not be loaded.`}</p>
    </div>
  );
}

export function Panel({
  title, description, actions, children, tone = "default",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "danger" | "warn";
}) {
  return (
    <section className={cn(
      "rounded-lg border bg-card p-4",
      tone === "danger" && "border-red-500/50 bg-red-500/[0.03]",
      tone === "warn" && "border-amber-500/50 bg-amber-500/[0.03]",
    )}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Metric({
  label, value, tone, hint,
}: { label: string; value: React.ReactNode; tone?: "danger" | "warn" | "ok"; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1 text-xl font-bold tabular-nums",
        tone === "danger" && "text-red-400",
        tone === "warn" && "text-amber-400",
        tone === "ok" && "text-emerald-400",
      )}>
        {value ?? "—"}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ContractChips() {
  return (
    <div className="flex flex-wrap gap-1">
      {[PLATFORM_CONTRACT, CAPABILITY_SPEC, PLATFORM_DNA, ARCHITECTURE_VERSION, `Constitution ${CONSTITUTION_VERSION}`]
        .map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
    </div>
  );
}

/* ------------------------------------------------------------------- tables */

export interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
  className?: string;
}

export function RecordTable({
  rows, columns, empty = "The Cognitive Control API returned no records.", rowKey = "id",
}: {
  rows: Record<string, unknown>[];
  columns: Column[];
  empty?: string;
  rowKey?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => <th key={c.key} scope="col" className="px-2 py-1.5 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={str(row[rowKey], String(i))} className="border-b last:border-0 hover:bg-muted/40">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-1.5 align-top", c.className)}>
                  {c.render ? c.render(row) : (row[c.key] == null ? <span className="text-muted-foreground">—</span> : str(row[c.key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Search + page size in one keyboard-friendly control strip. */
export function ListControls({
  query, onQuery, count, placeholder = "Filter records…", children,
}: {
  query: string;
  onQuery: (v: string) => void;
  count: number;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        className="h-8 max-w-xs text-sm"
        aria-label={placeholder}
      />
      {children}
      <span className="text-xs text-muted-foreground">{count} record{count === 1 ? "" : "s"}</span>
    </div>
  );
}

export function Pager({
  page, pageSize, total, onPage,
}: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-3 flex items-center gap-2" aria-label="Pagination">
      <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
      <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}

export function usePagedRows(rows: Record<string, unknown>[], pageSize: number) {
  const [page, setPage] = useState(1);
  const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  return { paged, page, setPage: (p: number) => setPage(Math.max(1, p)) };
}

/* ------------------------------------------------------- structured metadata */

/** Renders backend metadata verbatim, minus any private reasoning fields. */
export function MetadataBlock({ value }: { value: unknown }) {
  if (value == null) return <p className="text-sm text-muted-foreground">Not reported.</p>;
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-sm text-muted-foreground">None reported.</p>;
    return (
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={i} className="rounded border bg-muted/30 px-2 py-1 text-sm">
            {typeof v === "object" ? <MetadataBlock value={v} /> : str(v)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k]) => !isForbiddenKey(k));
    if (!entries.length) return <p className="text-sm text-muted-foreground">Not reported.</p>;
    return (
      <dl className="grid gap-1 sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded border bg-muted/20 px-2 py-1">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</dt>
            <dd className="text-sm break-words">{typeof v === "object" && v ? str(v) : str(v, "—")}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="whitespace-pre-wrap text-sm">{str(value)}</p>;
}

/** Operational metadata flow. Not a reconstruction of hidden reasoning. */
export function CognitiveFlow({ stages }: { stages?: Record<string, unknown>[] }) {
  const byStage = new Map<string, Record<string, unknown>>();
  (stages ?? []).forEach((s) => byStage.set(str(s.stage ?? s.name).toLowerCase(), s));
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5">
      {COGNITIVE_FLOW_STAGES.map((stage, i) => {
        const rec = byStage.get(stage.toLowerCase());
        const reported = !!rec;
        return (
          <li key={stage} className="flex items-center gap-1.5">
            <div className={cn(
              "min-w-[7rem] rounded-md border px-2 py-1.5",
              reported ? "border-primary/50 bg-primary/5" : "border-dashed text-muted-foreground",
            )}>
              <p className="text-[11px] font-semibold">{stage}</p>
              <p className="text-[10px] text-muted-foreground">
                {reported ? str(rec?.status ?? rec?.summary ?? "reported") : "not reported"}
              </p>
            </div>
            {i < COGNITIVE_FLOW_STAGES.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function PrivacyNotice() {
  return (
    <p className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
      Operational metadata only. Private model reasoning (chain-of-thought) is never stored, transmitted or
      reconstructed by this workspace.
    </p>
  );
}

export function ArchitectureLinks({ faculty }: { faculty?: string }) {
  const links = [
    { to: "/architecture/dna", label: "Platform DNA" },
    { to: "/architecture/contracts", label: "Contract" },
    { to: "/architecture/capspecs", label: "CapSpec" },
    { to: "/architecture/dependencies", label: "Dependencies" },
    { to: "/architecture/versions", label: "Version" },
    { to: "/architecture/health", label: "Health" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {faculty && <span className="text-muted-foreground">{faculty} →</span>}
      {links.map((l, i) => (
        <span key={l.to} className="flex items-center gap-1">
          <Link to={l.to} className="text-primary hover:underline">{l.label}</Link>
          {i < links.length - 1 && <span aria-hidden className="text-muted-foreground">/</span>}
        </span>
      ))}
    </div>
  );
}
