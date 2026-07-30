import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HealthScore } from "@/hooks/oic/use-oic";

export function toneFor(score: number) {
  if (score >= 75) return { text: "text-success", bar: "bg-success", ring: "border-success/40" };
  if (score >= 50) return { text: "text-warning", bar: "bg-warning", ring: "border-warning/40" };
  return { text: "text-destructive", bar: "bg-destructive", ring: "border-destructive/40" };
}

export function HealthTile({ item, compact = false }: { item: HealthScore; compact?: boolean }) {
  const tone = toneFor(item.score);
  return (
    <Card className={cn("border", tone.ring)}>
      <CardContent className={cn("space-y-2", compact ? "p-3" : "p-4")}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
          <span className={cn("text-xl font-bold tabular-nums", tone.text)}>{item.score}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${item.score}%` }} />
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
      </CardContent>
    </Card>
  );
}

export function HealthGrid({ items, compact }: { items: HealthScore[]; compact?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <HealthTile key={i.key} item={i} compact={compact} />
      ))}
    </div>
  );
}
