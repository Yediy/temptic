// Shared presentation primitives for the WOIC Perception & Context Workspace (PC-6.1B).
// Rendering only — no perception, no scoring, no resolution, no inference.
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ARCHITECTURE_VERSION, CAPABILITY_SPEC, COMPOSITION_INPUTS, FRESHNESS_STYLES,
  PLATFORM_CONTRACT, PLATFORM_DNA, RESOLUTION_STYLES, SEVERITY_STYLES, SOURCE_HEALTH_STYLES,
  normalizeFreshness, normalizeResolution, normalizeSeverity, normalizeSourceHealth,
  scorePercent, str,
} from "@/lib/perception/platform";
import type { CapabilityStatus } from "@/hooks/perception/use-perception";

/* --------------------------------------------------------------- indicators */

export function FreshnessBadge({ value }: { value: unknown }) {
  const s = normalizeFreshness(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNKNOWN</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", FRESHNESS_STYLES[s])}>
      {s}
    </span>
  );
}

export function SourceHealthBadge({ value }: { value: unknown }) {
  const s = normalizeSourceHealth(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNKNOWN</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", SOURCE_HEALTH_STYLES[s])}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

export function ResolutionBadge({ value }: { value: unknown }) {
  const s = normalizeResolution(value);
  if (!s) return <span className="text-xs text-muted-foreground">UNKNOWN</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", RESOLUTION_STYLES[s])}>
      {s}
      {s === "UNRESOLVED" && <span className="ml-1 font-normal opacity-80">no match forced</span>}
    </span>
  );
}

export function SeverityBadge({ value }: { value: unknown }) {
  const s = normalizeSeverity(value);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", SEVERITY_STYLES[s])}>{s}</span>;
}

/**
 * Scores are shown only when the backend reported them. Perception values that
 * declared no score are shown as UNSTATED, never as a fabricated number.
 */
export function ScoreMeter({ value, label = "Score" }: { value: unknown; label?: string }) {
  const pct = scorePercent(value);
  if (pct == null) {
    return (
      <span className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
        UNSTATED
      </span>
    );
  }
  const tone = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: ${pct}%`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

export function UnresolvedFlag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
      ⚠ {children}
    </span>
  );
}

export function RestrictedNotice({ label = "restricted source" }: { label?: string }) {
  return (
    <span className="rounded border border-violet-500/50 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
      PERMISSION RESTRICTED — contents withheld ({label})
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
          {label} is served by the Phase 6.1A Perception &amp; Context API, which is not available in this
          environment. Nothing is shown because no perception has been reported — this workspace never
          manufactures observations, context or scores.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">API reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">PERCEPTION API ERROR</p>
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

/* --------------------------------------------------------- composition view */

/** Structural depiction of how a pack was assembled. Not hidden reasoning. */
export function CompositionFlow({
  inputs, onSelect, selected,
}: {
  inputs?: Record<string, unknown>[];
  onSelect?: (key: string) => void;
  selected?: string | null;
}) {
  const byKey = new Map<string, Record<string, unknown>>();
  (inputs ?? []).forEach((i) => byKey.set(str(i.source ?? i.name ?? i.key).toLowerCase(), i));
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-primary/50 bg-primary/5 px-2 py-1.5 text-center text-[11px] font-semibold">
        Cognitive Request
      </div>
      <p aria-hidden className="text-center text-muted-foreground">↓</p>
      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {COMPOSITION_INPUTS.map((label) => {
          const rec = byKey.get(label.toLowerCase());
          const reported = !!rec;
          const isSel = selected === label;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onSelect?.(label)}
                aria-pressed={isSel}
                className={cn(
                  "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                  reported ? "border-primary/40 bg-primary/5 hover:bg-primary/10" : "border-dashed text-muted-foreground",
                  isSel && "ring-1 ring-primary",
                )}
              >
                <p className="text-[11px] font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {reported ? str(rec?.status ?? rec?.item_count ?? "contributed") : "not reported"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      <p aria-hidden className="text-center text-muted-foreground">↓</p>
      <div className="rounded-md border border-primary/50 bg-primary/5 px-2 py-1.5 text-center text-[11px] font-semibold">
        Context Pack
      </div>
    </div>
  );
}

export function PrivacyNotice() {
  return (
    <p className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
      Operational metadata only. Private model reasoning is never stored, transmitted or reconstructed here, and
      restricted source contents are never displayed merely because their metadata is visible.
    </p>
  );
}

export function ArchitectureLinks() {
  const links = [
    { to: "/architecture/contracts", label: "Contract" },
    { to: "/architecture/capspecs", label: "CapSpec" },
    { to: "/architecture/dna", label: "Platform DNA" },
    { to: "/architecture/dependencies", label: "Dependencies" },
    { to: "/cognition", label: "Cognitive Control" },
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
