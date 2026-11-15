import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { RecordTable } from "@/components/cognition/CogBits";
import { useAuth } from "@/lib/auth";
import { useContextPacks } from "@/hooks/perception/use-context-packs";
import { buildPrivacyView } from "@/lib/perception/privacy";

const TIER_LABEL = { none: "No perception access", staff: "Staff view", admin: "Agency admin view", super: "Platform view" } as const;

function Locked({ what }: { what: string }) {
  return <p className="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"><Lock className="h-3 w-3" />{what} require agency admin access.</p>;
}

export function PrivacyInspector() {
  const { roles = [], agencyId } = useAuth();
  const packs = useContextPacks(50);
  const samples = (packs.data ?? []).flatMap((p) => [p.request.input, p.request.output, ...p.evidence.map((e) => e.raw)]);
  const v = buildPrivacyView(roles as string[], agencyId ?? null, samples);

  if (v.tier === "none") return <Locked what="Privacy details" />;
  return (
    <div className="space-y-4">
      <Badge variant="outline">{TIER_LABEL[v.tier]}</Badge>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Privacy classification</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {v.classification.map((c) => (
            <div key={c.cls} className="rounded-md border p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{c.cls}</span>
                <Badge variant={c.visible ? "outline" : "secondary"} className="text-[10px]">{c.visible ? "visible to you" : "hidden for you"}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Excluded sensitive context markers</h3>
        {v.markers === null ? <Locked what="Sensitive context markers" /> : v.markers.length === 0
          ? <p className="text-xs text-muted-foreground">No sensitive or restricted fields found in recent WOIC context.</p>
          : (
            <div className="flex flex-wrap gap-1">
              {v.markers.map((m) => (
                <Badge key={m.path} variant={m.cls === "restricted" ? "destructive" : "secondary"} className="font-mono text-[10px]">{m.path} · {m.cls}</Badge>
              ))}
            </div>
          )}
        <p className="text-[11px] text-muted-foreground">Field paths only — values are never shown here. Scanned from your agency's latest {packs.data?.length ?? 0} context packs.</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Tenant scope rules</h3>
        {v.tenantScope === null ? <Locked what="Tenant scope rules" /> : (
          <>
            <p className="text-xs text-muted-foreground">
              {v.tenantScope.agencyId ? <>Scoped to agency <span className="font-mono">{v.tenantScope.agencyId.slice(0, 8)}</span>. Rows outside it are blocked by database rules.</> : "Platform admin: cross-tenant visibility."}
            </p>
            <RecordTable
              rows={v.tenantScope.rules as unknown as Record<string, unknown>[]}
              columns={[
                { key: "resource", label: "WOIC resource" },
                { key: "read", label: "You can read", render: (r) => (r.read ? "yes" : "no") },
                { key: "write", label: "You can write", render: (r) => (r.write ? "yes" : "no") },
                ...(v.tier === "super" ? [
                  { key: "readRoles", label: "Read roles", render: (r: Record<string, unknown>) => (r.readRoles as string[]).join(", ") },
                  { key: "writeRoles", label: "Write roles", render: (r: Record<string, unknown>) => (r.writeRoles as string[]).join(", ") },
                ] : []),
              ]}
            />
          </>
        )}
      </section>

      {v.moduleScopes && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Module scopes</h3>
          <div className="space-y-1 text-xs">
            {Object.entries(v.moduleScopes).map(([m, rs]) => <p key={m}><span className="font-mono">{m}</span>: <span className="text-muted-foreground">{rs.join(", ")}</span></p>)}
          </div>
        </section>
      )}
    </div>
  );
}
