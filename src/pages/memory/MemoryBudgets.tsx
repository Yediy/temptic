import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  BudgetBar, CapabilityState, MetadataBlock, Panel, PrivacyNotice,
} from "@/components/memory/MemBits";
import { useMemoryCapability, useMemoryList, useMemorySettings } from "@/hooks/memory/use-memory";
import { BUDGET_DIMENSIONS, asRecord, formatCost, str } from "@/lib/memory/platform";

export default function MemoryBudgets() {
  const [settings] = useMemorySettings();
  const [sessionId, setSessionId] = useState("");

  const sessions = useMemoryList("memory.sessions.list", {}, { refetchInterval: settings.refreshMs });
  const activeId = sessionId || str(asRecord(sessions.rows[0]).id ?? asRecord(sessions.rows[0]).session_id);

  const budgets = useMemoryCapability<Record<string, unknown>>(
    "memory.budgets.get",
    activeId ? { session_id: activeId } : {},
    { refetchInterval: settings.refreshMs },
  );
  const data = asRecord(budgets.data);
  const dims = asRecord(data.budgets ?? data);

  return (
    <div className="space-y-4">
      <Panel title="Cognitive Budgets" description="Allocation and consumption reported by WOIC, with threshold warnings.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="budget-session" className="text-xs text-muted-foreground">Session (optional)</label>
          <Input
            id="budget-session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder={activeId || "organization-wide"}
            className="h-8 w-72 font-mono text-xs"
          />
        </div>

        <CapabilityState status={budgets.status} message={budgets.message} label="cognitive budgets">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUDGET_DIMENSIONS.map((d) => (
              <BudgetBar key={d.key} label={d.label} detail={d.detail} budget={asRecord(dims[d.key])} />
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Total Cost</p>
              <p className="text-sm tabular-nums">{formatCost(data.cost ?? asRecord(dims.cost).used)}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Threshold Warnings</p>
              <MetadataBlock value={data.warnings} />
            </div>
          </div>
        </CapabilityState>
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
