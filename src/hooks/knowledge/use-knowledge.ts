// Knowledge Workspace data layer.
//
// This hook module is a *read/compose* layer only. All knowledge processing
// (semantic retrieval, reasoning, generation) stays inside the Knowledge
// Intelligence Engine and is reached through the existing `woic-cognitive`
// edge function via `cognitive()`. Structured reads go straight to the
// `woic_knowledge_*` tables, where RLS enforces tenancy — no new APIs, no
// duplicated business logic.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cognitive } from "@/hooks/woic/use-cognitive";
import type { GraphEdge, GraphNode } from "@/hooks/graph/use-graph";
import type { WoicKnowledgeArticle } from "@/lib/woic/types";
import {
  ASSISTANT_TASKS,
  classifyKind,
  type KnowledgeKind,
  type SearchMode,
} from "@/lib/knowledge/taxonomy";

export interface KnowledgeArticle extends WoicKnowledgeArticle {
  kind: KnowledgeKind;
}

export interface KnowledgeCategory {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export interface KnowledgeVersion {
  id: string;
  article_id: string;
  version: number;
  title: string;
  body: string;
  tags: string[] | null;
  edited_by: string | null;
  edited_at: string;
}

function decorate(rows: WoicKnowledgeArticle[]): KnowledgeArticle[] {
  return rows.map((r) => ({ ...r, kind: classifyKind(r.tags) }));
}

/* ------------------------------------------------------------------ reads */

export function useKnowledgeArticles(agencyId?: string, limit = 300) {
  return useQuery({
    queryKey: ["knowledge", "articles", agencyId, limit],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("woic_knowledge_articles")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return decorate((data ?? []) as unknown as WoicKnowledgeArticle[]);
    },
  });
}

export function useKnowledgeCategories(agencyId?: string) {
  return useQuery({
    queryKey: ["knowledge", "categories", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("woic_knowledge_categories")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as KnowledgeCategory[];
    },
  });
}

export function useArticleVersions(articleId?: string) {
  return useQuery({
    queryKey: ["knowledge", "versions", articleId],
    enabled: !!articleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("woic_knowledge_versions")
        .select("*")
        .eq("article_id", articleId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as KnowledgeVersion[];
    },
  });
}

/* --------------------------------------------------------------- mutations */

export function useSetArticleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const { error } = await supabase
        .from("woic_knowledge_articles")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
      return vars;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge", "articles"] }),
  });
}

/* ------------------------------------------------------- filtering helpers */

export interface KnowledgeFilter {
  kind?: KnowledgeKind;
  status?: string;
  q?: string;
  tag?: string;
  categoryId?: string;
}

export function filterArticles(rows: KnowledgeArticle[], f: KnowledgeFilter): KnowledgeArticle[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (f.kind && f.kind !== "article" && r.kind !== f.kind) return false;
    if (f.status && f.status !== "all" && r.status !== f.status) return false;
    if (f.categoryId && r.category_id !== f.categoryId) return false;
    if (f.tag && !(r.tags ?? []).some((t) => t.toLowerCase() === f.tag!.toLowerCase())) return false;
    if (q) {
      const hay = `${r.title} ${r.body ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ----------------------------------------------------- cognitive assistant */

export interface AssistantResult {
  task: string;
  text: string;
  raw: Record<string, unknown>;
}

function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["text", "summary", "answer", "explanation", "content", "report", "message"]) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return JSON.stringify(raw, null, 2);
}

export function useKnowledgeAssistant() {
  return useMutation({
    mutationFn: async (vars: {
      agency_id: string;
      task: string;
      article?: KnowledgeArticle | null;
      prompt?: string;
    }): Promise<AssistantResult> => {
      const def = ASSISTANT_TASKS.find((t) => t.key === vars.task);
      if (!def) throw new Error("Unknown assistant task");
      const raw = await cognitive<Record<string, unknown>>(vars.agency_id, def.operation, {
        subject_entity: "knowledge_article",
        subject_id: vars.article?.id ?? null,
        objective: def.instruction,
        question: vars.prompt ?? def.instruction,
        context: vars.article
          ? {
              title: vars.article.title,
              status: vars.article.status,
              version: vars.article.version,
              tags: vars.article.tags,
              body: (vars.article.body ?? "").slice(0, 8000),
            }
          : undefined,
      });
      return { task: vars.task, text: extractText(raw), raw };
    },
  });
}

/** Semantic / concept retrieval delegated to the cognitive core. */
export function useSemanticKnowledgeSearch() {
  return useMutation({
    mutationFn: async (vars: { agency_id: string; query: string; mode: SearchMode }) => {
      const raw = await cognitive<Record<string, unknown>>(vars.agency_id, "retrieve_knowledge", {
        query: vars.query,
        mode: vars.mode,
        limit: 20,
      });
      return { text: extractText(raw), raw };
    },
  });
}

/* ------------------------------------------------------------- graph model */

/** Projects knowledge articles, tags and categories into the shared graph shape. */
export function useKnowledgeGraph(articles: KnowledgeArticle[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const tagIds = new Map<string, string>();

    for (const a of articles.slice(0, 120)) {
      nodes.push({
        id: a.id,
        label: a.title,
        entity_type: a.kind,
        weight: a.version,
        attributes: { status: a.status },
      });
      for (const tag of (a.tags ?? []).slice(0, 6)) {
        const key = tag.toLowerCase();
        let tid = tagIds.get(key);
        if (!tid) {
          tid = `tag:${key}`;
          tagIds.set(key, tid);
          nodes.push({ id: tid, label: tag, entity_type: "concept", weight: 1 });
        }
        edges.push({ id: `${a.id}->${tid}`, from_id: a.id, to_id: tid, relation: "tagged", weight: 1 });
      }
    }
    return { nodes, edges };
  }, [articles]);
}

export function knowledgeNodeColor(type: string): string {
  switch (type) {
    case "policy": return "#f59e0b";
    case "sop": return "#38bdf8";
    case "regulation": return "#f43f5e";
    case "training": return "#a78bfa";
    case "certification": return "#34d399";
    case "document": return "#94a3b8";
    case "concept": return "#64748b";
    default: return "#60a5fa";
  }
}

/* ------------------------------------------------- persisted workspace state */

interface WorkspaceState {
  recents: string[];
  bookmarks: string[];
  savedSearches: { id: string; label: string; query: string; mode: SearchMode }[];
  collections: { id: string; name: string; articleIds: string[] }[];
  annotations: Record<string, { id: string; text: string; at: string }[]>;
  settings: { density: "comfortable" | "compact"; dark: boolean; showAiPanel: boolean };
}

const EMPTY: WorkspaceState = {
  recents: [],
  bookmarks: [],
  savedSearches: [],
  collections: [],
  annotations: {},
  settings: { density: "comfortable", dark: true, showAiPanel: true },
};

const STORAGE_KEY = "iwos.knowledge.workspace.v1";

function read(): WorkspaceState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<WorkspaceState>) };
  } catch {
    return EMPTY;
  }
}

export function useKnowledgeWorkspaceState() {
  const [state, setState] = useState<WorkspaceState>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state stays in memory */
    }
  }, [state]);

  const trackView = useCallback((id: string) => {
    setState((s) => ({ ...s, recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, 20) }));
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks],
    }));
  }, []);

  const saveSearch = useCallback((label: string, query: string, mode: SearchMode) => {
    setState((s) => ({
      ...s,
      savedSearches: [{ id: crypto.randomUUID(), label, query, mode }, ...s.savedSearches].slice(0, 30),
    }));
  }, []);

  const removeSearch = useCallback((id: string) => {
    setState((s) => ({ ...s, savedSearches: s.savedSearches.filter((x) => x.id !== id) }));
  }, []);

  const createCollection = useCallback((name: string) => {
    setState((s) => ({ ...s, collections: [{ id: crypto.randomUUID(), name, articleIds: [] }, ...s.collections] }));
  }, []);

  const removeCollection = useCallback((id: string) => {
    setState((s) => ({ ...s, collections: s.collections.filter((c) => c.id !== id) }));
  }, []);

  const toggleInCollection = useCallback((collectionId: string, articleId: string) => {
    setState((s) => ({
      ...s,
      collections: s.collections.map((c) =>
        c.id !== collectionId
          ? c
          : {
              ...c,
              articleIds: c.articleIds.includes(articleId)
                ? c.articleIds.filter((x) => x !== articleId)
                : [...c.articleIds, articleId],
            },
      ),
    }));
  }, []);

  const addAnnotation = useCallback((articleId: string, text: string) => {
    setState((s) => ({
      ...s,
      annotations: {
        ...s.annotations,
        [articleId]: [
          { id: crypto.randomUUID(), text, at: new Date().toISOString() },
          ...(s.annotations[articleId] ?? []),
        ],
      },
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<WorkspaceState["settings"]>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  return {
    ...state,
    trackView,
    toggleBookmark,
    saveSearch,
    removeSearch,
    createCollection,
    removeCollection,
    toggleInCollection,
    addAnnotation,
    updateSettings,
  };
}

/* ---------------------------------------------------------------- analytics */

export interface KnowledgeAnalytics {
  total: number;
  published: number;
  drafts: number;
  inReview: number;
  archived: number;
  stale: number;
  healthScore: number;
  byKind: { kind: string; count: number }[];
  topTags: { tag: string; count: number }[];
  recentlyUpdated: KnowledgeArticle[];
  unused: KnowledgeArticle[];
}

export function useKnowledgeAnalytics(articles: KnowledgeArticle[], recents: string[]): KnowledgeAnalytics {
  return useMemo(() => {
    const total = articles.length;
    const count = (s: string) => articles.filter((a) => a.status === s).length;
    const ninetyDays = Date.now() - 90 * 24 * 3600 * 1000;
    const stale = articles.filter((a) => new Date(a.updated_at).getTime() < ninetyDays).length;

    const kinds = new Map<string, number>();
    const tags = new Map<string, number>();
    for (const a of articles) {
      kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1);
      for (const t of a.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1);
    }

    const published = count("published") + count("approved");
    const healthScore = total === 0 ? 0 : Math.round(((published - stale * 0.5) / total) * 100);

    return {
      total,
      published,
      drafts: count("draft"),
      inReview: count("review"),
      archived: count("archived") + count("retired"),
      stale,
      healthScore: Math.max(0, Math.min(100, healthScore)),
      byKind: [...kinds.entries()].map(([kind, c]) => ({ kind, count: c })).sort((a, b) => b.count - a.count),
      topTags: [...tags.entries()].map(([tag, c]) => ({ tag, count: c })).sort((a, b) => b.count - a.count).slice(0, 12),
      recentlyUpdated: articles.slice(0, 8),
      unused: articles.filter((a) => !recents.includes(a.id)).slice(0, 8),
    };
  }, [articles, recents]);
}
