// IWOS Global Workforce Graph — client SDK.
// Thin, typed wrappers around the `woic-graph` edge function so any module can
// reason over relationships without re-implementing traversal logic.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GraphOperation =
  | "taxonomy" | "sync" | "subgraph" | "neighbors" | "shortest_path" | "similar"
  | "influence" | "communities" | "risk_propagation" | "resolve"
  | "find_similar_workers" | "find_missing_skills" | "find_hidden_experts"
  | "find_career_paths" | "find_team_dependencies" | "find_organizational_risks"
  | "find_knowledge_clusters" | "find_success_patterns" | "find_high_risk_projects"
  | "find_compliance_chains" | "find_equipment_dependencies" | "find_workforce_bottlenecks";

export interface GraphNode {
  id: string;
  label: string;
  entity_type: string;
  attributes?: Record<string, unknown> | null;
  weight?: number | null;
}
export interface GraphEdge {
  id: string;
  from_id: string;
  to_id: string;
  relation: string;
  weight?: number | null;
  confidence?: number | null;
}
export interface Subgraph { nodes: GraphNode[]; edges: GraphEdge[]; cached?: boolean }

export interface NodeType { key: string; label: string; category: string; color: string | null }
export interface RelationType { key: string; label: string; category: string; from_types: string[]; to_types: string[] }

export async function graph<T = unknown>(
  agencyId: string,
  operation: GraphOperation,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("woic-graph", {
    body: { agency_id: agencyId, operation, params },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return ((data as { data?: T })?.data ?? data) as T;
}

function useGraphQuery<T>(
  key: string,
  agencyId: string | undefined,
  operation: GraphOperation,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    queryKey: ["graph", key, agencyId, params],
    enabled: !!agencyId && options.enabled !== false,
    staleTime: options.staleTime ?? 60_000,
    queryFn: () => graph<T>(agencyId!, operation, params),
  });
}

export const useGraphTaxonomy = (agencyId?: string) =>
  useGraphQuery<{ node_types: NodeType[]; relation_types: RelationType[] }>(
    "taxonomy", agencyId, "taxonomy", {}, { staleTime: 30 * 60_000 });

export const useSubgraph = (
  agencyId?: string,
  params: { entity_types?: string[]; relations?: string[]; as_of?: string | null; limit?: number } = {},
) => useGraphQuery<Subgraph>("subgraph", agencyId, "subgraph", params as Record<string, unknown>);

export const useGraphNeighbors = (agencyId?: string, nodeId?: string, depth = 2) =>
  useGraphQuery<{ node_id: string; neighbors: Array<Record<string, unknown>> }>(
    "neighbors", agencyId, "neighbors", { node_id: nodeId, depth }, { enabled: !!nodeId });

export const useGraphInfluence = (agencyId?: string, entityType?: string, limit = 25) =>
  useGraphQuery<{ results: Array<Record<string, unknown>> }>(
    "influence", agencyId, "influence", { entity_type: entityType, limit });

export const useGraphCommunities = (agencyId?: string, limit = 12) =>
  useGraphQuery<{ communities: Array<Record<string, unknown>> }>(
    "communities", agencyId, "communities", { limit }, { staleTime: 5 * 60_000 });

export const useOrganizationalRisks = (agencyId?: string) =>
  useGraphQuery<{ risks: Array<Record<string, unknown>>; top_skills: unknown[]; top_people: unknown[] }>(
    "org_risks", agencyId, "find_organizational_risks");

export const useWorkforceBottlenecks = (agencyId?: string) =>
  useGraphQuery<{ bottlenecks: Array<Record<string, unknown>> }>(
    "bottlenecks", agencyId, "find_workforce_bottlenecks");

export const useHiddenExperts = (agencyId?: string) =>
  useGraphQuery<{ experts: Array<Record<string, unknown>> }>("hidden_experts", agencyId, "find_hidden_experts");

export const useHighRiskProjects = (agencyId?: string) =>
  useGraphQuery<{ projects: Array<Record<string, unknown>> }>("high_risk_projects", agencyId, "find_high_risk_projects");

export const useEquipmentDependencies = (agencyId?: string) =>
  useGraphQuery<{ equipment: Array<Record<string, unknown>> }>("equipment_deps", agencyId, "find_equipment_dependencies");

export const useComplianceChains = (agencyId?: string) =>
  useGraphQuery<{ chains: Array<Record<string, unknown>> }>("compliance_chains", agencyId, "find_compliance_chains");

export const useKnowledgeClusters = (agencyId?: string) =>
  useGraphQuery<{ clusters: Array<Record<string, unknown>> }>("knowledge_clusters", agencyId, "find_knowledge_clusters");

export const useSuccessPatterns = (agencyId?: string) =>
  useGraphQuery<{ patterns: Array<Record<string, unknown>>; total_successful: number }>(
    "success_patterns", agencyId, "find_success_patterns");

export function useGraphSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { agency_id: string; limit?: number }) =>
      graph<{ nodes: number; edges: number; by_type: Record<string, number> }>(
        vars.agency_id, "sync", { limit: vars.limit }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["graph"] }),
  });
}

export function useGraphAction<T = unknown>(operation: GraphOperation) {
  return useMutation({
    mutationFn: (vars: { agency_id: string } & Record<string, unknown>) => {
      const { agency_id, ...params } = vars;
      return graph<T>(agency_id, operation, params);
    },
  });
}

export const useShortestPath = () =>
  useGraphAction<{ path: Array<Record<string, unknown>>; hops: number; connected: boolean }>("shortest_path");
export const useSimilarWorkers = () =>
  useGraphAction<{ workers: Array<Record<string, unknown>> }>("find_similar_workers");
export const useMissingSkills = () =>
  useGraphAction<{ gaps: Array<Record<string, unknown>> }>("find_missing_skills");
export const useCareerPaths = () =>
  useGraphAction<{ paths: Array<Record<string, unknown>> }>("find_career_paths");
export const useTeamDependencies = () =>
  useGraphAction<{ dependencies: Array<Record<string, unknown>> }>("find_team_dependencies");
export const useRiskPropagation = () =>
  useGraphAction<{ impacted: Array<Record<string, unknown>> }>("risk_propagation");
