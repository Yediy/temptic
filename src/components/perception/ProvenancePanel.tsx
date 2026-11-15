import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { MetadataBlock } from "@/components/cognition/CogBits";
import { useAuth } from "@/lib/auth";
import { buildProvenance, privacyTier, type PrivacyClass } from "@/lib/perception/privacy";

const CLS_VARIANT: Record<PrivacyClass, "outline" | "secondary" | "destructive"> = {
  general: "outline", internal: "secondary", sensitive: "secondary", restricted: "destructive",
};

export function ProvenancePanel({ raw, ctx, title = "Evidence provenance" }: {
  raw: Record<string, unknown>;
  ctx: Parameters<typeof buildProvenance>[1];
  title?: string;
}) {
  const { roles = [] } = useAuth();
  const tier = privacyTier(roles as string[]);
  const p = buildProvenance(raw, ctx, tier);
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        {p.withheld > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />{p.withheld} field(s) withheld</span>
        )}
      </div>
      <ol className="space-y-1 border-l pl-3">
        {p.chain.map((s) => (
          <li key={s.label} className="text-xs">
            <span className="text-muted-foreground">{s.label}: </span>
            <span className="font-mono">{s.value ?? "not recorded"}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-1">
        {p.fields.map((f) => (
          <Badge key={f.key} variant={CLS_VARIANT[f.cls]} className="gap-1 font-mono text-[10px]">
            {!f.visible && <Lock className="h-2.5 w-2.5" />}{f.key} · {f.cls}
          </Badge>
        ))}
      </div>
      <MetadataBlock value={p.scoped} />
    </div>
  );
}
