// Platform Optimization Workspace client API (PC-5.8D).
//
// Thin transport over the existing Platform Optimization Engine
// (`woic-cognitive`) and the existing cognitive datastore. No solving,
// ranking, Pareto filtering or sensitivity computation happens in the browser:
// every value rendered by the workspace is returned by the engine.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cognitive, useSimulations as useCognitiveRows } from "@/hooks/woic/use-cognitive";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_OPT_SETTINGS, emptyDefinition, OPT_CALIBRATION_KEY, OPT_DECISION_QUEUE_KEY, OPT_SAVED_DEFS_KEY,
  OPT_SAVED_RESULTS_KEY, OPT_SETTINGS_KEY, isOptimizationRow, optName, optimizationCapabilities,
  parseOptimization, readJson, toEnginePayload, writeJson,
  type DecisionHandoff, type OptCalibrationRecord, type OptSettings, type OptimizationCapability,
  type OptimizationDefinition, type OptimizationRecord, type SavedDefinition, type Strategy,
} from "@/lib/optimization/platform";

/* ---------------------------------------------------------------- run store */

export type OptRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface OptimizationRun {
  id: string;
  name: string;
  mode: string;
  horizon: string;
  status: OptRunStatus;
  startedAt: number;
  finishedAt?: number;
  progress: number;
  error?: string;
  resultId?: string;
  strategies?: number;
}

let runs: OptimizationRun[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => runs;

const upsertRun = (run: OptimizationRun) => {
  runs = [run, ...runs.filter((r) => r.id !== run.id)].slice(0, 50);
  emit();
};
const patchRun = (id: string, patch: Partial<OptimizationRun>) => {
  runs = runs.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
};

/** Live run registry — powers Optimization Runs, progress and cancellation. */
export const useOptimizationRuns = () => useSyncExternalStore(subscribe, snapshot, snapshot);

export const cancelOptimizationRun = (id: string) =>
  patchRun(id, { status: "cancelled", finishedAt: Date.now(), progress: 100 });

/* ------------------------------------------------------------- engine calls */

export function useRunOptimization() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();

  const run = useCallback(
    async (def: OptimizationDefinition): Promise<OptimizationRecord | null> => {
      if (!agencyId) throw new Error("No agency context available.");
      const payload = toEnginePayload(def);
      const runId = crypto.randomUUID();
      upsertRun({
        id: runId,
        name: def.name || def.question.slice(0, 60) || "Optimization",
        mode: def.mode,
        horizon: def.horizon,
        status: "running",
        startedAt: Date.now(),
        progress: 5,
      });

      const tick = window.setInterval(() => {
        const current = runs.find((r) => r.id === runId);
        if (!current || current.status !== "running") return;
        patchRun(runId, { progress: Math.min(92, current.progress + 6) });
      }, 900);

      try {
        const data = await cognitive<Record<string, unknown>>(agencyId, "simulate", payload);
        window.clearInterval(tick);
        if (runs.find((r) => r.id === runId)?.status === "cancelled") return null;

        const record = parseOptimization({
          id: String((data.simulation_id as string) ?? (data.id as string) ?? runId),
          agency_id: agencyId,
          scenario: payload.scenario,
          created_at: new Date().toISOString(),
          confidence: data.confidence ?? null,
          inputs: payload.inputs,
          results: (data.results as Record<string, unknown>) ?? data,
        });
        patchRun(runId, {
          status: "succeeded", progress: 100, finishedAt: Date.now(),
          resultId: record.id, strategies: record.strategies.length,
        });
        qc.invalidateQueries({ queryKey: ["woic", "simulations"] });
        return record;
      } catch (e) {
        window.clearInterval(tick);
        patchRun(runId, {
          status: "failed", progress: 100, finishedAt: Date.now(),
          error: e instanceof Error ? e.message : "Optimization engine unavailable.",
        });
        throw e;
      }
    },
    [agencyId, qc],
  );

  return { run };
}

/** Natural language → structured optimization, translated by the engine. */
export function useOptimizationTranslation() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string): Promise<Partial<OptimizationDefinition> | null> => {
    if (!agencyId || !text.trim()) return null;
    setPending(true);
    setError(null);
    try {
      const data = await cognitive<Record<string, unknown>>(agencyId, "reason", {
        question:
          "Translate the following optimization request into a structured optimization definition. " +
          "Respond with JSON only using this shape: " +
          '{"name":"","question":"","mode":"balanced|cost|speed|risk|quality|utilisation|coverage|robust|pareto",' +
          '"horizon":"24h|7d|30d|90d|6m|1y|3y","entities":[""],"resources":[""],' +
          '"objectives":[{"key":"","label":"","direction":"maximise|minimise","weight":0.5,"priority":1,"target":"","threshold":"","horizon":"90d","measurement":"platform_metric","mandatory":false}],' +
          '"constraints":[{"source":"constitution|government|regulation|contract|policy|safety|budget|schedule|skills|certification|resources|technology|platform|custom","statement":"","enforcement":"HARD|SOFT|ADVISORY","reference":""}]}. ' +
          `Request: ${text}`,
        scope: "optimization",
      });
      const raw = String(data.answer ?? data.summary ?? data.explanation ?? JSON.stringify(data));
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("The engine did not return a structured optimization.");
      return JSON.parse(match[0]) as Partial<OptimizationDefinition>;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
      return null;
    } finally {
      setPending(false);
    }
  }, [agencyId]);

  return { translate, pending, error };
}

/* ------------------------------------------------------------- WOIC tasks */

export type OptAssistantTask =
  | "explain_recommendation" | "explain_tradeoffs" | "why_rejected" | "binding_constraints"
  | "cheaper_option_blocked" | "sacrifice_analysis" | "uncertainty" | "executive_summary"
  | "recommend_optimizations" | "risk_summary" | "pareto_reasoning" | "resource_plan";

export const OPT_ASSISTANT_TASKS: Array<{ key: OptAssistantTask; label: string; prompt: string }> = [
  { key: "explain_recommendation", label: "Explain the recommendation", prompt: "Explain why this strategy is recommended: which objectives it satisfies, which constraints bind, and what evidence supports it." },
  { key: "explain_tradeoffs", label: "Explain the tradeoffs", prompt: "Explain the tradeoffs between these strategies: why one costs more, why another is safer, and what is sacrificed by each." },
  { key: "why_rejected", label: "Why was this rejected?", prompt: "Explain precisely which constraint or objective caused each rejected strategy to be discarded." },
  { key: "binding_constraints", label: "Which constraints bind?", prompt: "Identify the binding constraints, state which cheaper or faster options they block, and name the source of each constraint." },
  { key: "cheaper_option_blocked", label: "What blocks a cheaper option?", prompt: "Identify the cheapest theoretically feasible option and state exactly what blocks it today." },
  { key: "sacrifice_analysis", label: "What is sacrificed?", prompt: "For each alternative strategy, state clearly what is sacrificed relative to the recommendation." },
  { key: "uncertainty", label: "What uncertainty remains?", prompt: "State the remaining uncertainty: data gaps, fragile assumptions, unmodelled dependencies, and what would raise confidence." },
  { key: "executive_summary", label: "Executive summary", prompt: "Write an executive summary: objective, recommended strategy, expected benefit, expected cost, top risks, top tradeoffs, confidence, key constraints, alternatives and the decision required." },
  { key: "recommend_optimizations", label: "Recommend optimizations", prompt: "Recommend high-impact optimizations this organization should run next and why each matters." },
  { key: "risk_summary", label: "Summarize risks", prompt: "Summarize risks by domain with probability, impact, confidence and the Platform Organisms affected." },
  { key: "pareto_reasoning", label: "Why is this on the frontier?", prompt: "Explain why this strategy sits on the nondominated frontier and which strategies dominate or are dominated by it." },
  { key: "resource_plan", label: "Explain the resource plan", prompt: "Explain the resource allocation: what is over-committed, what is idle, and where capacity risk sits." },
];

export function useOptimizationAssistant() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (task: OptAssistantTask, context: unknown) => {
    if (!agencyId) { setError("No agency context available."); return; }
    const spec = OPT_ASSISTANT_TASKS.find((t) => t.key === task);
    setPending(true);
    setError(null);
    setAnswer("");
    try {
      const operation = task === "explain_recommendation" || task === "uncertainty" ? "explain" : "reason";
      const data = await cognitive<Record<string, unknown>>(agencyId, operation, {
        question: `${spec?.prompt ?? ""}\n\nOptimization context (JSON):\n${JSON.stringify(context).slice(0, 12000)}`,
        subject: "platform_optimization",
        scope: "optimization",
      });
      setAnswer(String(data.answer ?? data.explanation ?? data.summary ?? JSON.stringify(data).slice(0, 4000)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "WOIC is unavailable.");
    } finally {
      setPending(false);
    }
  }, [agencyId]);

  return { ask, pending, answer, error, reset: () => setAnswer("") };
}

/* -------------------------------------------------------------- read models */

export function useOptimizationHistory(limit = 200) {
  const { agencyId } = useAuth();
  const query = useCognitiveRows(agencyId ?? undefined, limit);
  const records = useMemo(
    () => (query.data ?? [])
      .map((r) => r as Record<string, unknown>)
      .filter(isOptimizationRow)
      .map(parseOptimization),
    [query.data],
  );
  return {
    records,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
    refetch: query.refetch,
  };
}

export function useOptimization(id?: string) {
  const { records, isLoading, error } = useOptimizationHistory();
  return { record: records.find((r) => r.id === id) ?? null, isLoading, error };
}

/* ----------------------------------------------------- simulation handoff */

/** Send a candidate strategy to the Simulation Workspace engine for projection. */
export function useStrategySimulation() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projections, setProjections] = useState<Record<string, { outcomes: string[]; confidence: number | null }>>({});

  const simulate = useCallback(async (record: OptimizationRecord, strategy: Strategy) => {
    if (!agencyId) { setError("No agency context available."); return; }
    setPending(strategy.id);
    setError(null);
    try {
      const data = await cognitive<Record<string, unknown>>(agencyId, "simulate", {
        scenario: `Simulate the projected outcome of applying this optimization strategy: ${strategy.name}. ${strategy.summary}`,
        inputs: {
          artifact: "simulation",
          origin: "optimization",
          optimization_id: record.id,
          strategy_id: strategy.id,
          mode: "expected",
          horizon: String(record.inputs.horizon ?? "90d"),
          contract: "PC-5.8D",
        },
      });
      const results = (data.results as Record<string, unknown>) ?? data;
      const outcomes = Array.isArray((results as Record<string, unknown>).outcomes)
        ? ((results as Record<string, unknown>).outcomes as unknown[]).map((o) =>
            String((o as Record<string, unknown>)?.description ?? o))
        : [];
      setProjections((p) => ({
        ...p,
        [strategy.id]: { outcomes, confidence: data.confidence == null ? null : Number(data.confidence) },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation Workspace is unavailable.");
    } finally {
      setPending(null);
    }
  }, [agencyId]);

  return { simulate, pending, error, projections };
}

/* ------------------------------------------------------- decision handoff */

/**
 * Selecting a strategy never executes it. The strategy is routed to Decision
 * Intelligence (WOIC decisions) where approval authority applies.
 */
export function useDecisionHandoff() {
  const { agencyId } = useAuth();
  const [queue, setQueue] = useDecisionQueue();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (record: OptimizationRecord, strategy: Strategy) => {
    if (!agencyId) { setError("No agency context available."); return; }
    setPending(strategy.id);
    setError(null);
    const handoff: DecisionHandoff = {
      id: crypto.randomUUID(),
      optimizationId: record.id,
      optimizationName: optName(record),
      strategyId: strategy.id,
      strategyName: strategy.name,
      submittedAt: new Date().toISOString(),
      approvalRoles: strategy.approval.roles.length ? strategy.approval.roles : ["agency_admin"],
      reason: strategy.approval.reason || "Strategy selection requires documented approval authority before execution.",
      policy: strategy.approval.policy,
      constitution: strategy.approval.constitution || "IWOS Constitution v1.0 §Decision Authority",
      status: "sent",
      detail: "",
    };
    try {
      await cognitive(agencyId, "recommend", {
        kind: "optimization_strategy",
        subject_entity: "optimization",
        subject_id: record.id,
        target_entity: "strategy",
        target_id: strategy.id,
        reasoning: strategy.explanation || strategy.summary,
        context: {
          strategy, objectives: record.inputs.objectives, constraints: record.inputs.constraints,
          requires_approval: true, contract: "PC-5.8D",
        },
      });
    } catch (e) {
      handoff.status = "failed";
      handoff.detail = e instanceof Error ? e.message : "Decision Console is unavailable.";
      setError(handoff.detail);
    } finally {
      setQueue([handoff, ...queue].slice(0, 100));
      setPending(null);
    }
    return handoff;
  }, [agencyId, queue, setQueue]);

  return { send, pending, error, queue };
}

/* ------------------------------------------------------------ local stores */

function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJson<T>(key, fallback));
  useEffect(() => { writeJson(key, value); }, [key, value]);
  return [value, setValue] as const;
}

export const useDraftDefinition = () =>
  useLocalStore<OptimizationDefinition>("iwos.optimization.draft.v1", emptyDefinition());
export const useOptSettings = () => useLocalStore<OptSettings>(OPT_SETTINGS_KEY, DEFAULT_OPT_SETTINGS);
export const useSavedDefinitions = () => useLocalStore<SavedDefinition[]>(OPT_SAVED_DEFS_KEY, []);
export const useSavedOptimizations = () => useLocalStore<string[]>(OPT_SAVED_RESULTS_KEY, []);
export const useOptCalibrationLog = () => useLocalStore<OptCalibrationRecord[]>(OPT_CALIBRATION_KEY, []);
export function useDecisionQueue() { return useLocalStore<DecisionHandoff[]>(OPT_DECISION_QUEUE_KEY, []); }

/* --------------------------------------------------------------- permissions */

export function useOptimizationPermissions() {
  const { roles } = useAuth();
  const caps = useMemo(() => optimizationCapabilities(roles ?? []), [roles]);
  return { caps, can: (c: OptimizationCapability) => caps.has(c) };
}
