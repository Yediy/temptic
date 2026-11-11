import type { FabricEvent } from "@/lib/activity/events";
import type { GraphEdge, GraphNode } from "@/lib/activity/inspector-access";

const KIND_CLASS: Record<GraphNode["kind"], string> = {
  event: "fill-primary stroke-primary",
  related: "fill-accent stroke-border",
  object: "fill-muted stroke-border",
  subscriber: "fill-secondary stroke-border",
};

export function EventRelationshipGraph({ nodes, edges, onSelect }: { nodes: GraphNode[]; edges: GraphEdge[]; onSelect?: (e: FabricEvent) => void }) {
  const W = 520, H = 320, cx = W / 2, cy = H / 2;
  const others = nodes.slice(1);
  const pos = new Map<string, { x: number; y: number }>([[nodes[0].id, { x: cx, y: cy }]]);
  others.forEach((n, i) => {
    const a = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, { x: cx + Math.cos(a) * 190, y: cy + Math.sin(a) * 120 });
  });
  const trim = (s: string) => (s.length > 22 ? s.slice(0, 21) + "…" : s);
  return (
    <div className="rounded-md border bg-card">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Event relationship graph">
        {edges.map((e) => {
          const a = pos.get(e.from)!, b = pos.get(e.to)!;
          return (
            <g key={e.from + e.to}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth={1.2} />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 3} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>{e.label}</text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const clickable = n.kind === "related" && n.ref && onSelect;
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} className={clickable ? "cursor-pointer" : undefined}
               onClick={clickable ? () => onSelect!(n.ref!) : undefined}>
              <title>{n.label}</title>
              <rect x={-62} y={-12} width={124} height={24} rx={6} className={KIND_CLASS[n.kind]} strokeWidth={1} />
              <text textAnchor="middle" y={4} fontSize={9} fontFamily="monospace"
                className={n.kind === "event" ? "fill-primary-foreground" : "fill-foreground"}>{trim(n.label)}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>■ event</span><span>related (click to open)</span><span>affected object</span><span>subscriber</span>
      </div>
    </div>
  );
}
