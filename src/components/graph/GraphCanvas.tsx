import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "@/hooks/graph/use-graph";

/**
 * Interactive force-directed graph renderer on canvas.
 * Supports zoom, pan, hover/selection highlighting, heat-map and risk overlays.
 * No external graph library — the simulation is a lightweight Fruchterman-
 * Reingold variant that runs for a bounded number of ticks.
 */

export interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  colorForType: (type: string) => string;
  /** node id -> 0..1 intensity for the heat/risk overlay */
  overlay?: Record<string, number>;
  overlayMode?: "none" | "heat" | "risk";
  selectedId?: string | null;
  onSelect?: (node: GraphNode | null) => void;
  height?: number;
  /** Visual arrangement of nodes. */
  layout?: GraphLayoutMode;
}

export type GraphLayoutMode = "force" | "radial" | "hierarchy" | "tree";

interface Sim { id: string; x: number; y: number; vx: number; vy: number; deg: number }

/** Deterministic non-force arrangements (radial rings, typed columns, BFS tree). */
function applyLayout(
  mode: Exclude<GraphLayoutMode, "force">,
  sims: Map<string, Sim>,
  nodes: GraphNode[],
  adjacency: Map<string, Set<string>>,
) {
  const types = [...new Set(nodes.map((n) => n.entity_type))].sort();
  if (mode === "radial" || mode === "hierarchy") {
    const buckets = new Map<string, GraphNode[]>();
    for (const n of nodes) (buckets.get(n.entity_type) ?? buckets.set(n.entity_type, []).get(n.entity_type)!).push(n);
    types.forEach((t, ti) => {
      const group = buckets.get(t) ?? [];
      group.forEach((n, i) => {
        const s = sims.get(n.id);
        if (!s) return;
        if (mode === "radial") {
          const radius = 90 + ti * 78;
          const angle = (i / Math.max(group.length, 1)) * Math.PI * 2;
          s.x = Math.cos(angle) * radius;
          s.y = Math.sin(angle) * radius;
        } else {
          s.x = (ti - (types.length - 1) / 2) * 190;
          s.y = (i - (group.length - 1) / 2) * 26;
        }
      });
    });
    return;
  }
  // tree: BFS levels from the highest-degree node
  const root = [...sims.values()].sort((a, b) => b.deg - a.deg)[0];
  if (!root) return;
  const level = new Map<string, number>([[root.id, 0]]);
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const nb of adjacency.get(id) ?? []) {
      if (level.has(nb)) continue;
      level.set(nb, (level.get(id) ?? 0) + 1);
      queue.push(nb);
    }
  }
  const rows = new Map<number, string[]>();
  for (const n of nodes) {
    const lv = level.get(n.id) ?? 99;
    (rows.get(lv) ?? rows.set(lv, []).get(lv)!).push(n.id);
  }
  for (const [lv, ids] of rows) {
    ids.forEach((id, i) => {
      const s = sims.get(id);
      if (!s) return;
      s.y = (lv - 2) * 110;
      s.x = (i - (ids.length - 1) / 2) * 60;
    });
  }
}

export default function GraphCanvas({
  nodes, edges, colorForType, overlay, overlayMode = "none",
  selectedId, onSelect, height = 560, layout = "force",
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Map<string, Sim>>(new Map());
  const viewRef = useRef({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [, force] = useState(0);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      (m.get(e.from_id) ?? m.set(e.from_id, new Set()).get(e.from_id)!).add(e.to_id);
      (m.get(e.to_id) ?? m.set(e.to_id, new Set()).get(e.to_id)!).add(e.from_id);
    }
    return m;
  }, [edges]);

  // (Re)seed and run the layout whenever the graph changes.
  useEffect(() => {
    const sims = new Map<string, Sim>();
    const n = Math.max(nodes.length, 1);
    nodes.forEach((node, i) => {
      const angle = (i / n) * Math.PI * 2;
      const radius = 120 + (i % 7) * 26;
      sims.set(node.id, {
        id: node.id,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0, vy: 0,
        deg: adjacency.get(node.id)?.size ?? 0,
      });
    });

    const k = Math.sqrt((900 * 700) / n);
    for (let iter = 0; iter < 220; iter++) {
      const temp = 12 * (1 - iter / 220);
      const arr = [...sims.values()];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d = Math.hypot(dx, dy) || 0.01;
          if (d > k * 4) continue;
          const rep = (k * k) / d / 12;
          dx /= d; dy /= d;
          a.vx += dx * rep; a.vy += dy * rep;
          b.vx -= dx * rep; b.vy -= dy * rep;
        }
      }
      for (const e of edges) {
        const a = sims.get(e.from_id), b = sims.get(e.to_id);
        if (!a || !b) continue;
        let dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const att = (d * d) / k / 30;
        dx /= d; dy /= d;
        a.vx -= dx * att; a.vy -= dy * att;
        b.vx += dx * att; b.vy += dy * att;
      }
      for (const s of sims.values()) {
        s.vx -= s.x * 0.004; s.vy -= s.y * 0.004; // gravity to center
        const speed = Math.hypot(s.vx, s.vy) || 0.01;
        const limited = Math.min(speed, temp);
        s.x += (s.vx / speed) * limited;
        s.y += (s.vy / speed) * limited;
        s.vx *= 0.82; s.vy *= 0.82;
      }
    }
    if (layout !== "force") applyLayout(layout, sims, nodes, adjacency);

    simRef.current = sims;
    viewRef.current = { scale: 1, x: 0, y: 0 };
    force((v) => v + 1);
  }, [nodes, edges, adjacency, layout]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { scale, x: ox, y: oy } = viewRef.current;
    const cx = w / 2 + ox, cy = h / 2 + oy;
    const px = (v: number) => cx + v * scale;
    const py = (v: number) => cy + v * scale;

    const focus = hover ?? selectedId ?? null;
    const near = focus ? adjacency.get(focus) ?? new Set<string>() : null;

    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = simRef.current.get(e.from_id), b = simRef.current.get(e.to_id);
      if (!a || !b) continue;
      const active = !!focus && (e.from_id === focus || e.to_id === focus);
      ctx.strokeStyle = active ? "rgba(56,189,248,0.85)" : focus ? "rgba(120,130,150,0.10)" : "rgba(120,130,150,0.28)";
      ctx.lineWidth = active ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(px(a.x), py(a.y));
      ctx.lineTo(px(b.x), py(b.y));
      ctx.stroke();
    }

    for (const node of nodes) {
      const s = simRef.current.get(node.id);
      if (!s) continue;
      const r = Math.max(4, Math.min(16, 4 + Math.sqrt(s.deg) * 2.4)) * Math.min(scale, 1.6);
      const dim = !!focus && node.id !== focus && !near?.has(node.id);
      const intensity = overlay?.[node.id] ?? 0;
      let fill = colorForType(node.entity_type);
      if (overlayMode !== "none" && intensity > 0) {
        const hue = overlayMode === "risk" ? 0 : 40;
        fill = `hsl(${hue} 90% ${Math.round(65 - intensity * 30)}%)`;
      }
      ctx.globalAlpha = dim ? 0.18 : 1;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px(s.x), py(s.y), r, 0, Math.PI * 2);
      ctx.fill();
      if (node.id === selectedId) {
        ctx.strokeStyle = "hsl(var(--primary))";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if ((scale > 0.9 && s.deg > 1) || node.id === focus) {
        ctx.globalAlpha = dim ? 0.25 : 0.95;
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.font = `${Math.max(9, 11 * Math.min(scale, 1.4))}px ui-sans-serif, system-ui`;
        ctx.fillText(node.label.slice(0, 26), px(s.x) + r + 3, py(s.y) + 3);
      }
      ctx.globalAlpha = 1;
    }
  }, [nodes, edges, adjacency, hover, selectedId, overlay, overlayMode, colorForType]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const nodeAt = (clientX: number, clientY: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { scale, x: ox, y: oy } = viewRef.current;
    const cx = rect.width / 2 + ox, cy = rect.height / 2 + oy;
    const mx = clientX - rect.left, my = clientY - rect.top;
    let best: { node: GraphNode; d: number } | null = null;
    for (const node of nodes) {
      const s = simRef.current.get(node.id);
      if (!s) continue;
      const d = Math.hypot(cx + s.x * scale - mx, cy + s.y * scale - my);
      if (d < 14 && (!best || d < best.d)) best = { node, d };
    }
    return best?.node ?? null;
  };

  return (
    <div className="relative rounded-lg border bg-card" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={(ev) => {
          ev.preventDefault();
          const next = viewRef.current.scale * (ev.deltaY < 0 ? 1.12 : 0.89);
          viewRef.current.scale = Math.max(0.25, Math.min(4, next));
          draw();
        }}
        onMouseDown={(ev) => { dragRef.current = { x: ev.clientX, y: ev.clientY }; }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; setHover(null); draw(); }}
        onMouseMove={(ev) => {
          if (dragRef.current) {
            viewRef.current.x += ev.clientX - dragRef.current.x;
            viewRef.current.y += ev.clientY - dragRef.current.y;
            dragRef.current = { x: ev.clientX, y: ev.clientY };
            draw();
            return;
          }
          const n = nodeAt(ev.clientX, ev.clientY);
          if ((n?.id ?? null) !== hover) { setHover(n?.id ?? null); draw(); }
        }}
        onClick={(ev) => onSelect?.(nodeAt(ev.clientX, ev.clientY))}
      />
      <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted-foreground">
        Scroll to zoom · drag to pan · click a node to inspect
      </div>
    </div>
  );
}
