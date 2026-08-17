// Platform Simulation Workspace client API.
// Thin transport over the existing Platform Simulation Engine
// (`woic-cognitive`) and the single simulation datastore (`woic_simulations`).
// No scenario execution, prediction or graph reasoning happens here.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cognitive } from "@/hooks/woic/use-cognitive";
import { useSimulations as useSimulationRows } from "@/hooks/woic/use-cognitive";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_SIM_SETTINGS, SIM_ARCHIVE_KEY, SIM_CALIBRATION_KEY, SIM_SAVED_RESULTS_KEY,
  SIM_SAVED_SCENARIOS_KEY, SIM_SETTINGS_KEY, parseSimulation, readJson, simulationCapabilities,
  toEnginePayload, writeJson,
  type CalibrationRecord, type SavedScenario, type ScenarioDefinition, type SimSettings,
  type SimulationCapability, type SimulationRecord,
} from "@/lib/simulation/platform";

/* ---------------------------------------------------------------- run store */

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface SimulationRun {
  id: string;
  name: string;
  mode: string;
  horizon: string;
  status: RunStatus;
  startedAt: number;
  finishedAt?: number;
  progress: number;
  error?: string;
  resultId?: string;
}

let runs: SimulationRun[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => runs;

function upsertRun(run: SimulationRun) {
  runs = [run, ...runs.filter((r) => r.id !== run.id)].slice(0, 50);
  emit();
}
function patchRun(id: string, patch: Partial<SimulationRun>) {
  runs = runs.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
}

/** Live async run registry — powers Live Runs, progress and cancellation. */
export function useSimulationRuns() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function cancelRun(id: string) {
  patchRun(id, { status: "cancelled", finishedAt: Date.now(), progress: 100 });
}

/* ------------------------------------------------------------- engine calls */

export function useRunSimulation() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();

  const run = useCallback(
    async (def: ScenarioDefinition): Promise<SimulationRecord | null> => {
      if (!agencyId) throw new Error("No agency context available.");
      const payload = toEnginePayload(def);
      const runId = crypto.randomUUID();
      upsertRun({
        id: runId,
        name: def.name || def.question.slice(0, 60) || "Scenario",
        mode: def.mode,
        horizon: def.horizon,
        status: "running",
        startedAt: Date.now(),
        progress: 5,
      });

      const tick = window.setInterval(() => {
        const current = runs.find((r) => r.id === runId);
        if (!current || current.status !== "running") return;
        patchRun(runId, { progress: Math.min(92, current.progress + 7) });
      }, 900);

      try {
        const data = await cognitive<Record<string, unknown>>(agencyId, "simulate", payload);
        window.clearInterval(tick);
        const state = runs.find((r) => r.id === runId);
        if (state?.status === "cancelled") return null;

        const record = parseSimulation({
          id: String((data.simulation_id as string) ?? (data.id as string) ?? runId),
          agency_id: agencyId,
          scenario: payload.scenario,
          created_at: new Date().toISOString(),
          confidence: data.confidence ?? null,
          inputs: payload.inputs,
          results: data.results ?? { outcomes: data.outcomes ?? [], assumptions: data.assumptions ?? [] },
          recommendations: data.recommendations ?? [],
        });
        patchRun(runId, { status: "succeeded", progress: 100, finishedAt: Date.now(), resultId: record.id });
        qc.invalidateQueries({ queryKey: ["woic", "simulations"] });
        return record;
      } catch (e) {
        window.clearInterval(tick);
        patchRun(runId, {
          status: "failed",
          progress: 100,
          finishedAt: Date.now(),
          error: e instanceof Error ? e.message : "Simulation engine unavailable.",
        });
        throw e;
      }
    },
    [agencyId, qc],
  );

  return { run };
}

/** Natural-language → structured scenario, translated by the engine. */
export function useScenarioTranslation() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string): Promise<Partial<ScenarioDefinition> | null> => {
    if (!agencyId || !text.trim()) return null;
    setPending(true);
    setError(null);
    try {
      const data = await cognitive<Record<string, unknown>>(agencyId, "reason", {
        question:
          "Translate the following simulation request into a structured scenario definition. " +
          "Respond with JSON only using this shape: " +
          '{"name":"","question":"","mode":"single|comparison|sensitivity|stress|best|expected|worst|counterfactual|replay|forward|cascade|probabilistic",' +
          '"horizon":"24h|7d|30d|90d|6m|1y|3y","entity_kinds":[""],"entities":[""],"policies":[""],"constraints":[""],' +
          '"variables":[{"key":"","value":""}],"assumptions":[{"statement":"","source":"woic","confidence":0.5,"editable":true,"impact":"medium"}]}. ' +
          `Request: ${text}`,
        scope: "simulation",
      });
      const raw = String(data.answer ?? data.summary ?? data.explanation ?? JSON.stringify(data));
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("The engine did not return a structured scenario.");
      return JSON.parse(match[0]) as Partial<ScenarioDefinition>;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
      return null;
    } finally {
      setPending(false);
    }
  }, [agencyId]);

  return { translate, pending, error };
}

export type AssistantTask =
  | "explain_scenario" | "compare_outcomes" | "missing_variables" | "recommend_scenarios"
  | "weak_assumptions" | "summarize_risks" | "suggest_mitigation" | "executive_summary"
  | "board_summary" | "action_plan" | "confidence_gaps";

export const ASSISTANT_TASKS: Array<{ key: AssistantTask; label: string; prompt: string }> = [
  { key: "explain_scenario", label: "Explain this simulation", prompt: "Explain why this result occurred, which evidence, dependencies and assumptions mattered most." },
  { key: "compare_outcomes", label: "Compare outcomes", prompt: "Compare the outcome branches and state what changed between them and why." },
  { key: "missing_variables", label: "Identify missing variables", prompt: "Identify variables missing from this scenario that would materially change the result." },
  { key: "recommend_scenarios", label: "Recommend more scenarios", prompt: "Recommend additional scenarios worth simulating next, and why each matters." },
  { key: "weak_assumptions", label: "Detect weak assumptions", prompt: "Detect assumptions with low confidence or high influence and explain the exposure." },
  { key: "summarize_risks", label: "Summarize risks", prompt: "Summarize the risks by category with severity, probability and second-order effects." },
  { key: "suggest_mitigation", label: "Suggest mitigation", prompt: "Suggest concrete mitigations for the highest severity risks, ranked by feasibility." },
  { key: "executive_summary", label: "Executive summary", prompt: "Write a concise executive summary: what changed, most likely outcome, best case, worst case, financial and operational impact, top risks and opportunities, confidence and recommended course." },
  { key: "board_summary", label: "Board summary", prompt: "Write a board-level summary in plain language with the decision being asked for." },
  { key: "action_plan", label: "Operational action plan", prompt: "Write an operational action plan with owners, sequencing and checkpoints." },
  { key: "confidence_gaps", label: "Why is confidence low?", prompt: "Explain why confidence is limited: data gaps, model limitations, missing dependencies and unsupported variables. State what additional information would improve confidence." },
];

export function useSimulationAssistant() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (task: AssistantTask, context: unknown) => {
    if (!agencyId) return;
    const spec = ASSISTANT_TASKS.find((t) => t.key === task);
    setPending(true);
    setError(null);
    setAnswer("");
    try {
      const operation = task === "explain_scenario" || task === "confidence_gaps" ? "explain" : "reason";
      const data = await cognitive<Record<string, unknown>>(agencyId, operation, {
        question: `${spec?.prompt ?? ""}\n\nSimulation context (JSON):\n${JSON.stringify(context).slice(0, 12000)}`,
        subject: "platform_simulation",
        scope: "simulation",
      });
      setAnswer(String(data.answer ?? data.explanation ?? data.summary ?? JSON.stringify(data).slice(0, 4000)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assistant unavailable.");
    } finally {
      setPending(false);
    }
  }, [agencyId]);

  return { ask, pending, answer, error, reset: () => setAnswer("") };
}

/* -------------------------------------------------------------- read models */

export function useSimulationHistory(limit = 100) {
  const { agencyId } = useAuth();
  const query = useSimulationRows(agencyId ?? undefined, limit);
  const records = useMemo(
    () => (query.data ?? []).map((r) => parseSimulation(r as Record<string, unknown>)),
    [query.data],
  );
  return { ...query, records };
}

export function useSimulation(id?: string) {
  const { records, isLoading, error } = useSimulationHistory(200);
  return { simulation: records.find((r) => r.id === id) ?? null, records, isLoading, error };
}

/* ------------------------------------------------------------ local storage */

function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJson<T>(key, fallback));
  useEffect(() => { writeJson(key, value); }, [key, value]);
  return [value, setValue] as const;
}

export const useSimSettings = () => useLocalStore<SimSettings>(SIM_SETTINGS_KEY, DEFAULT_SIM_SETTINGS);
export const useSavedScenarios = () => useLocalStore<SavedScenario[]>(SIM_SAVED_SCENARIOS_KEY, []);
export const useSavedResults = () => useLocalStore<string[]>(SIM_SAVED_RESULTS_KEY, []);
export const useArchivedSimulations = () => useLocalStore<string[]>(SIM_ARCHIVE_KEY, []);
export const useCalibrationLog = () => useLocalStore<CalibrationRecord[]>(SIM_CALIBRATION_KEY, []);

/* -------------------------------------------------------------- permissions */

export function useSimulationPermissions() {
  const { roles } = useAuth();
  const caps = useMemo(() => simulationCapabilities(roles as unknown as string[]), [roles]);
  const can = useCallback((c: SimulationCapability) => caps.has(c), [caps]);
  return { caps, can };
}
