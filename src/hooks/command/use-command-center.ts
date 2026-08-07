// IWOS Universal Command Center — command engine.
// Single source of truth for palette state, universal record search
// (ttos_search_index), command ranking, persisted history/favorites/pins,
// and natural-language routing into the existing WOIC cognitive API.
// Voice-ready: `runCommand` / `runNaturalLanguage` are transport-agnostic.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAccessibleModules } from "@/lib/permissions";
import { cognitive } from "@/hooks/woic/use-cognitive";
import {
  allCommands, rankCommands, looksNaturalLanguage, type CommandDef,
} from "@/lib/command/registry";

export interface RecordHit {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
}

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  ticket: (id) => `/tickets/${id}`,
  worker: (id) => `/talent/${id}`,
  client: () => `/clients`,
  job_order: (id) => `/jobs/${id}`,
  job: (id) => `/jobs/${id}`,
  invoice: () => `/pb/invoices`,
  payroll_run: () => `/pb/payroll-runs`,
  automation: (id) => `/automation/workflows/${id}`,
  event: () => `/activity`,
};

export function entityRoute(type: string, id: string): string | null {
  return ENTITY_ROUTES[type]?.(id) ?? null;
}

const LS = {
  recent: "iwos.cc.recent",
  favorites: "iwos.cc.favorites",
  pinned: "iwos.cc.pinned",
};

function readList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; } catch { return []; }
}
function writeList(key: string, v: string[]) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage disabled */ }
}

export interface AiResult {
  operation: string;
  prompt: string;
  output: string;
}

export function useCommandCenter() {
  const nav = useNavigate();
  const { agencyId } = useAuth();
  const { canAccess } = useAccessibleModules();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RecordHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [recent, setRecent] = useState<string[]>(() => readList(LS.recent));
  const [favorites, setFavorites] = useState<string[]>(() => readList(LS.favorites));
  const [pinned, setPinned] = useState<string[]>(() => readList(LS.pinned));

  // Global activation: Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Permission-filtered command catalog.
  const catalog = useMemo(
    () => allCommands().filter((c) => !c.permission || canAccess(c.permission)),
    [canAccess],
  );

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const ranked = useMemo(() => rankCommands(query, catalog), [query, catalog]);

  const pinnedCommands = useMemo(
    () => pinned.map((id) => byId.get(id)).filter(Boolean) as CommandDef[],
    [pinned, byId],
  );
  const favoriteCommands = useMemo(
    () => favorites.map((id) => byId.get(id)).filter(Boolean) as CommandDef[],
    [favorites, byId],
  );
  const recentCommands = useMemo(
    () => recent.map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as CommandDef[],
    [recent, byId],
  );

  // Universal record search through the existing TTOS search index (RLS scoped).
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setHits([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const safe = term.replace(/[%,()]/g, " ");
      const { data } = await supabase
        .from("ttos_search_index")
        .select("entity_type, entity_id, title, subtitle")
        .or(`title.ilike.%${safe}%,subtitle.ilike.%${safe}%`)
        .limit(15);
      if (!cancelled) { setHits((data ?? []) as RecordHit[]); setSearching(false); }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); setSearching(false); };
  }, [query]);

  const remember = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 20);
      writeList(LS.recent, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeList(LS.favorites, next);
      return next;
    });
  }, []);

  const togglePinned = useCallback((id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 8);
      writeList(LS.pinned, next);
      return next;
    });
  }, []);

  /** Run a WOIC cognitive operation. Shared by AI commands and voice input. */
  const runAi = useCallback(async (operation: string, prompt: string) => {
    if (!agencyId) { setAiError("No active organization."); return; }
    setAiBusy(true); setAiError(null); setAiResult(null);
    try {
      const data = await cognitive<Record<string, unknown>>(
        agencyId,
        operation as Parameters<typeof cognitive>[1],
        { prompt, query: prompt, source: "command_center" },
      );
      const output =
        (typeof data === "string" && data) ||
        (data?.output as string) || (data?.summary as string) ||
        (data?.text as string) || (data?.answer as string) ||
        JSON.stringify(data, null, 2);
      setAiResult({ operation, prompt, output });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "WOIC request failed.");
    } finally {
      setAiBusy(false);
    }
  }, [agencyId]);

  /** Execute any registered command by id. Voice maps straight into this. */
  const runCommand = useCallback((command: CommandDef) => {
    remember(command.id);
    if (command.kind === "ai") {
      void runAi(command.operation ?? "reason", query.trim() || command.label);
      return;
    }
    if (command.to) { nav(command.to); setOpen(false); setQuery(""); }
  }, [nav, query, remember, runAi]);

  const openRecord = useCallback((hit: RecordHit) => {
    const to = entityRoute(hit.entity_type, hit.entity_id);
    if (to) { nav(to); setOpen(false); setQuery(""); }
  }, [nav]);

  /** Free-form natural-language request routed to WOIC reasoning. */
  const runNaturalLanguage = useCallback((text: string) => runAi("reason", text), [runAi]);

  return {
    open, setOpen,
    query, setQuery,
    catalog, ranked, hits, searching,
    pinnedCommands, favoriteCommands, recentCommands,
    favorites, pinned, toggleFavorite, togglePinned,
    runCommand, openRecord, runNaturalLanguage,
    aiBusy, aiResult, aiError,
    isNaturalLanguage: looksNaturalLanguage(query),
  };
}
