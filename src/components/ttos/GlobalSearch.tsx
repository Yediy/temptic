import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

interface Hit {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
}

const ROUTE_MAP: Record<string, (id: string) => string> = {
  ticket: (id) => `/tickets/${id}`,
  worker: (id) => `/talent/${id}`,
  client: (id) => `/clients`,
  job_order: (id) => `/jobs/${id}`,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const nav = useNavigate();

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

  useEffect(() => {
    if (!q || q.length < 2) { setHits([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const term = q.trim();
      const { data } = await supabase
        .from("ttos_search_index")
        .select("entity_type, entity_id, title, subtitle")
        .or(`title.ilike.%${term}%,subtitle.ilike.%${term}%`)
        .limit(20);
      if (!cancelled) setHits((data ?? []) as Hit[]);
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <kbd className="ml-2 hidden sm:inline text-xs">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search workers, tickets, jobs, clients…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Results">
            {hits.map((h) => (
              <CommandItem
                key={`${h.entity_type}:${h.entity_id}`}
                onSelect={() => {
                  const to = ROUTE_MAP[h.entity_type]?.(h.entity_id);
                  if (to) { nav(to); setOpen(false); }
                }}
              >
                <div>
                  <div className="font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground">{h.entity_type} · {h.subtitle}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
