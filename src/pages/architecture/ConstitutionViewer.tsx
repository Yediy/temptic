import { ArticleRequired, EngineeringAssistant, Panel, RegistryState, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistry } from "@/hooks/architecture/use-architecture";
import { asArray, asRecord, list, matchesQuery, str } from "@/lib/architecture/platform";

export default function ConstitutionViewer() {
  const doc = useRegistry<Record<string, unknown>>("constitution.read");
  const record = asRecord(doc.data);
  const volumes = asArray(record.volumes);
  const pending = asArray(record.pending_articles);
  const { query, input } = useRowSearch(volumes);

  return (
    <div className="space-y-3">
      <Panel
        title="Constitution"
        description={`Constitution ${str(record.version, "version not reported")} — governance text is displayed exactly as registered.`}
        actions={input}
      >
        <RegistryState status={doc.status} message={doc.message} label="the Constitution">
          {volumes.length === 0
            ? <ArticleRequired label="The Constitution body" />
            : (
              <div className="space-y-4">
                {volumes.map((v, vi) => {
                  const articles = asArray(v.articles).filter((a) => matchesQuery(a, query));
                  return (
                    <section key={str(v.id, String(vi))}>
                      <h3 className="text-sm font-semibold">{str(v.title ?? v.name, `Volume ${vi + 1}`)}</h3>
                      {articles.length === 0
                        ? <ArticleRequired label={`Articles for ${str(v.title ?? v.name, "this volume")}`} />
                        : (
                          <ul className="mt-1 space-y-2">
                            {articles.map((a, ai) => (
                              <li key={str(a.id, String(ai))} className="rounded-md border p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                  {str(a.number ?? a.code, `Article ${ai + 1}`)} — {str(a.title)}
                                </p>
                                {str(a.text)
                                  ? <p className="mt-1 whitespace-pre-wrap text-sm">{str(a.text)}</p>
                                  : <ArticleRequired label={`Text for ${str(a.number ?? a.title, "this article")}`} />}
                                <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-3">
                                  <div><dt className="uppercase">Principles</dt><dd>{list(a.principles).join(", ") || "—"}</dd></div>
                                  <div><dt className="uppercase">Organisms</dt><dd>{list(a.organisms ?? a.referenced_organisms).join(", ") || "—"}</dd></div>
                                  <div><dt className="uppercase">Contracts</dt><dd>{list(a.contracts ?? a.referenced_contracts).join(", ") || "—"}</dd></div>
                                </dl>
                              </li>
                            ))}
                          </ul>
                        )}
                    </section>
                  );
                })}
              </div>
            )}
        </RegistryState>
      </Panel>

      <Panel title="Pending Articles" description="Governance documentation the registry reports as incomplete.">
        {pending.length === 0
          ? <p className="text-sm text-muted-foreground">The registry reports no pending articles.</p>
          : (
            <ul className="space-y-1">
              {pending.map((p, i) => (
                <li key={i} className="text-sm">
                  <span className="mr-2 rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">ARTICLE REQUIRED</span>
                  {str(p.title ?? p.number ?? p.id, "—")}
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <EngineeringAssistant context={{ constitution: record }} tasks={["locate", "summarize_contract"]} />
    </div>
  );
}
