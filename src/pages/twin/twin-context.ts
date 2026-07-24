import { useOutletContext } from "react-router-dom";

export interface TwinCtx {
  workerId?: string;
  twinId?: string;
  twin?: {
    id: string;
    career_health: number | null;
    performance_trend: unknown;
    learning_progress: number | null;
    growth_score: number | null;
    future_potential: number | null;
    risk_indicators: Record<string, unknown>;
    career_forecast: Record<string, unknown>;
    current_capabilities: unknown;
    model_version: string | null;
    last_learned_at: string | null;
  } | null;
}

export function useTwinCtx(): TwinCtx {
  return useOutletContext<TwinCtx>();
}
