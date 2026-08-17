import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EngineeringAssistant, Panel, RecordTable, RegistryState } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { str } from "@/lib/architecture/platform";

export default function EngineerSearch() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const results = useRegistryList("search.query", { query }, { enabled: query.length > 1 });

  return (
    <div className="space-y-3">
      <Panel title="Engineering Search" description="Universal search across organisms, APIs, events, permissions, contracts, ADRs and versions.">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => { e.preventDefault(); setQuery(draft.trim()); }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='e.g. "payroll calculation" or "ticket.signed"'
            aria-label="Engineering search query"
            className="h-9 max-w-md text-sm"
          />
          <Button type="submit" size="sm" disabled={draft.trim().length < 2}>Search registry</Button>
        </form>

        <div className="mt-3">
          {query.length < 2
            ? <p className="text-sm text-muted-foreground">Enter a query to search the Architecture Registry.</p>
            : (
              <RegistryState status={results.status} message={results.message} label="engineering search">
                <RecordTable
                  rows={results.rows}
                  empty="The registry returned no matches for this query."
                  columns={[
                    { key: "kind", label: "Kind", render: (r) => <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{str(r.kind ?? r.type, "—")}</span> },
                    { key: "name", label: "Record", render: (r) => <span className="font-medium">{str(r.name ?? r.title ?? r.id, "—")}</span> },
                    { key: "summary", label: "Summary" },
                    { key: "owner", label: "Owner" },
                    { key: "id", label: "Registry id", render: (r) => <span className="font-mono text-[11px]">{str(r.id, "—")}</span> },
                  ]}
                />
              </RegistryState>
            )}
        </div>
      </Panel>

      <EngineeringAssistant context={{ query, results: results.rows.slice(0, 60) }}
        tasks={["locate", "investigation_path", "affected_components"]} />
    </div>
  );
}
