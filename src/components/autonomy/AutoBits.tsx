import { useState } from "react";
import { AlertTriangle, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RISK_STYLES, STATE_STYLES, actorTypeLabel, authorityLabel, isAutonomousActor,
  normalizeRisk, normalizeState, type InterventionDef,
} from "@/lib/autonomy/platform";
import {
  OPS_ASSISTANT_TASKS, useOpsAssistant, type CapabilityStatus, type OpsAssistantTask,
} from "@/hooks/autonomy/use-autonomy";

/* --------------------------------------------------------------- indicators */

export function StateBadge({ state }: { state: unknown }) {
  const s = normalizeState(state);
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", STATE_STYLES[s])}>
      {s.replace("_", " ")}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: unknown }) {
  const r = normalizeRisk(risk);
  if (!r) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", RISK_STYLES[r])}>
      {r}
    </span>
  );
}

export function AuthorityBadge({ level }: { level: unknown }) {
  const l = String(level ?? "");
  if (!l) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
      <Lock className="h-2.5 w-2.5" aria-hidden /> {authorityLabel(l)}
    </span>
  );
}

/** Humans and autonomous actors must never look alike. */
export function ActorBadge({ type }: { type: unknown }) {
  const t = String(type ?? "");
  const autonomous = isAutonomousActor(t);
  return (
    <span className={cn(
      "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      autonomous
        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
        : "border-violet-500/50 bg-violet-500/10 text-violet-300",
    )}>
      {autonomous ? "◆ " : "● "}{actorTypeLabel(t)}
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
          {label} is served by the Phase 5.9A Autonomous Coordination Engine, which has not been deployed for this
          environment. No values are shown because none exist — nothing here is simulated.
        </p>
        {message && <p className="mt-1 text-[11px] text-muted-foreground/80">Engine reported: {message}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/5 p-4 text-sm">
      <p className="font-semibold text-red-400">ENGINE ERROR</p>
      <p className="mt-1 text-xs text-muted-foreground">{message ?? `${label} could not be loaded.`}</p>
    </div>
  );
}

export function NotYetAvailable({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm">
      <p className="font-semibold tracking-wide text-muted-foreground">NOT YET AVAILABLE</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail ?? `${label} is not exposed by the engine yet.`}</p>
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

/* -------------------------------------------------- governed control button */

export function GovernedAction({
  def, disabled, onConfirm, extraFields,
}: {
  def: InterventionDef;
  disabled?: boolean;
  onConfirm: (payload: { reason: string }) => Promise<void> | void;
  extraFields?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  const phraseOk = !def.confirmPhrase || phrase.trim().toUpperCase() === def.confirmPhrase;
  const emergency = def.danger === "emergency";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={emergency ? "destructive" : def.danger === "elevated" ? "outline" : "secondary"}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(emergency && "font-bold uppercase tracking-wide", def.danger === "elevated" && "border-amber-500/60 text-amber-400")}
      >
        {emergency && <ShieldAlert className="mr-1 h-4 w-4" aria-hidden />}
        {def.label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn(emergency && "text-red-400")}>
              {emergency && <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />}
              {def.label}
            </DialogTitle>
            <DialogDescription>{def.consequence}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {extraFields}
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="gov-reason">Reason (recorded in the Autonomy Ledger)</label>
              <Textarea id="gov-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Why is this human intervention necessary?" />
            </div>
            {def.confirmPhrase && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-red-400" htmlFor="gov-phrase">
                  Type {def.confirmPhrase} to confirm
                </label>
                <Input id="gov-phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              This request is executed by the Autonomous Coordination Engine under your identity and authority. The
              interface does not perform the action itself.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant={emergency ? "destructive" : "default"}
              disabled={busy || !reason.trim() || !phraseOk}
              onClick={async () => {
                setBusy(true);
                try { await onConfirm({ reason: reason.trim() }); setOpen(false); setReason(""); setPhrase(""); }
                finally { setBusy(false); }
              }}
            >
              {busy ? "Submitting…" : `Confirm ${def.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------------------------------------- WOIC assistant */

export function OpsAssistant({ context, tasks }: { context: unknown; tasks?: OpsAssistantTask[] }) {
  const { ask, pending, answer, error } = useOpsAssistant();
  const list = OPS_ASSISTANT_TASKS.filter((t) => !tasks || tasks.includes(t.key));
  return (
    <Panel title="WOIC Operations Assistant" description="Evidence-linked, permission-aware answers about live operations.">
      <div className="flex flex-wrap gap-1.5">
        {list.map((t) => (
          <Button key={t.key} type="button" size="sm" variant="outline" disabled={pending}
            onClick={() => ask(t.key, context)}>
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />{t.label}
          </Button>
        ))}
      </div>
      {pending && <p className="mt-3 text-xs text-muted-foreground">WOIC is reasoning over current operations…</p>}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {answer && <p className="mt-3 whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{answer}</p>}
    </Panel>
  );
}

export function ContractChips() {
  return (
    <div className="flex flex-wrap gap-1">
      {["PC-5.9B", "CapSpec-5.9B", "PDNA-5.9B", "IWOS v1.5.0", "Constitution v1.0"].map((c) => (
        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
      ))}
    </div>
  );
}

/** Generic engine record table — renders exactly what the engine returned. */
export function RecordTable({
  rows, columns, empty = "The engine returned no records.",
}: {
  rows: Record<string, unknown>[];
  columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }>;
  empty?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => <th key={c.key} className="px-2 py-1.5 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b last:border-0 hover:bg-muted/40">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5 align-top">
                  {c.render ? c.render(row) : (row[c.key] == null ? "—" : String(row[c.key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
