import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ENGINEER_TASKS, SEVERITY_STYLES, STABILITY_STYLES, matchesQuery,
  normalizeSeverity, normalizeStability, str,
  type EngineerTask,
} from "@/lib/architecture/platform";
import { useEngineeringAssistant, type RegistryStatus } from "@/hooks/architecture/use-architecture";

/* --------------------------------------------------------------- indicators */

export function StabilityBadge({ value }: { value: unknown }) {
  const s = normalizeStability(value);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STABILITY_STYLES[s])}>
      {s}
    </span>
  );
}

export function SeverityBadge({ value }: { value: unknown }) {
  const s = normalizeSeverity(value);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", SEVERITY_STYLES[s])}>
      {s}
    </span>
  );
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs">{children}</span>;
}

/* ------------------------------------------------------------ truthful states */

export function RegistryState({
  status, message, label, children,
}: {
  status: RegistryStatus;
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
          Your identity is not permitted to read {label}. {message}
        </p>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="rounded-md border border-dashed border-amber-500/60 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold tracking-wide text-amber-400">ARCHITECTURE REGISTRY UNAVAILABLE</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {label} is served by the canonical Phase 5.10A Architecture Registry, which is not deployed in this
          environment. Nothing is shown because no architecture metadata exists here — this console never
          manufactures architecture data.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">Registry reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">REGISTRY ERROR</p>
      <p className="mt-1 text-xs text-muted-foreground">{message ?? `${label} could not be loaded.`}</p>
    </div>
  );
}

export function ArticleRequired({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-amber-500/60 bg-amber-500/5 p-3">
      <p className="text-xs font-bold tracking-wide text-amber-400">ARTICLE REQUIRED</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {label} is not yet documented in the Constitution. No substitute text is displayed.
      </p>
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
  tone?: "default" | "danger";
}) {
  return (
    <section className={cn(
      "rounded-lg border bg-card p-4",
      tone === "danger" && "border-red-500/50 bg-red-500/[0.03]",
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

export function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" | "warn" | "ok" }) {
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
    </div>
  );
}

export function ContractChips() {
  return (
    <div className="flex flex-wrap gap-1">
      {["PC-5.10B", "CapSpec-5.10B", "PDNA-5.10B", "IWOS v1.5.0", "Constitution v1.0"].map((c) => (
        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- record table */

export interface Column {
  key: string;
  label: string;
  /** Optional renderer; defaults to a plain scalar cell. */
  render?: (row: Record<string, unknown>) => React.ReactNode;
  className?: string;
}

export function RecordTable({
  rows, columns, empty, linkTo,
}: {
  rows: Record<string, unknown>[];
  columns: Column[];
  empty: string;
  linkTo?: (row: Record<string, unknown>) => string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => <th key={c.key} className="py-1.5 pr-3 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const to = linkTo?.(row) ?? null;
            return (
              <tr key={str(row.id, String(i))} className="border-b last:border-0 hover:bg-muted/40">
                {columns.map((c, ci) => {
                  const cell = c.render ? c.render(row) : <span className="break-words">{str(row[c.key], "—") || "—"}</span>;
                  return (
                    <td key={c.key} className={cn("py-1.5 pr-3 align-top", c.className)}>
                      {ci === 0 && to ? <Link to={to} className="text-primary hover:underline">{cell}</Link> : cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Search box + client-side filtering over registry rows already fetched. */
export function useRowSearch(rows: Record<string, unknown>[]) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query]);
  const input = (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter records…"
        aria-label="Filter registry records"
        className="h-8 pl-7 text-xs"
      />
    </div>
  );
  return { query, setQuery, filtered, input };
}

/** Generic key/value viewer for structured registry records. */
export function KeyValue({ record, keys }: { record: Record<string, unknown>; keys?: Array<{ key: string; label: string }> }) {
  const entries = keys ?? Object.keys(record).map((k) => ({ key: k, label: k.replace(/_/g, " ") }));
  return (
    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {entries.map(({ key, label }) => {
        const value = record[key];
        const present = value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
        return (
          <div key={key} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm">
              {present
                ? (typeof value === "object"
                  ? <pre className="whitespace-pre-wrap font-mono text-[11px]">{JSON.stringify(value, null, 2)}</pre>
                  : String(value))
                : <span className="text-xs italic text-muted-foreground">not documented in the registry</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* --------------------------------------------------------- WOIC assistant */

export function EngineeringAssistant({ context, tasks }: { context: unknown; tasks?: EngineerTask[] }) {
  const { ask, pending, answer, error } = useEngineeringAssistant();
  const [question, setQuestion] = useState("");
  const list = ENGINEER_TASKS.filter((t) => !tasks || tasks.includes(t.key));

  return (
    <Panel
      title="WOIC Engineering Assistant"
      description="Answers are restricted to the Architecture Registry records loaded on this page and must cite them."
    >
      <div className="space-y-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder='e.g. "Who owns payroll calculations?" or "What breaks if Platform Graph is unavailable?"'
          aria-label="Engineering question"
        />
        <div className="flex flex-wrap gap-1.5">
          {list.map((t) => (
            <Button key={t.key} type="button" size="sm" variant="outline" disabled={pending}
              onClick={() => ask(t.key, context, question.trim() || undefined)}>
              {t.label}
            </Button>
          ))}
        </div>
        {pending && <p className="text-sm text-muted-foreground">WOIC is reading the registry records…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {answer && <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{answer}</p>}
      </div>
    </Panel>
  );
}
