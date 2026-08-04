// Node canvas for the Automation Studio Workflow Builder.
// Pure presentation: pan/zoom, drag, connect, minimap, grid snapping.
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NODE_TYPE_MAP } from "@/lib/automation/catalog";
import { GRID, snap, newId, type WorkflowEdge, type WorkflowGraph, type WorkflowNode } from "@/lib/automation/graph";

const NODE_W = 200;
const NODE_H = 68;

type Props = {
  graph: WorkflowGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (graph: WorkflowGraph, label: string) => void;
  onAddNode: (kind: string, x: number, y: number) => void;
};

export default function WorkflowCanvas({ graph, selectedId, onSelect, onChange, onAddNode }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      return {
        x: ((clientX - (rect?.left ?? 0)) - view.x) / view.z,
        y: ((clientY - (rect?.top ?? 0)) - view.y) / view.z,
      };
    },
    [view],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (pan) {
        setView((v) => ({ ...v, x: e.clientX - pan.x, y: e.clientY - pan.y }));
        return;
      }
      const p = toCanvas(e.clientX, e.clientY);
      if (linkFrom) setCursor(p);
      if (!drag) return;
      onChange(
        {
          ...graph,
          nodes: graph.nodes.map((n) => (n.id === drag.id ? { ...n, x: snap(p.x - drag.dx), y: snap(p.y - drag.dy) } : n)),
        },
        "Move node",
      );
    }
    function onUp() {
      setDrag(null);
      setPan(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, pan, graph, onChange, toCanvas, linkFrom]);

  function connect(to: string) {
    if (!linkFrom || linkFrom === to) {
      setLinkFrom(null);
      return;
    }
    const exists = graph.edges.some((e) => e.from === linkFrom && e.to === to);
    if (!exists) {
      const edge: WorkflowEdge = { id: newId("e"), from: linkFrom, to };
      onChange({ ...graph, edges: [...graph.edges, edge] }, "Connect nodes");
    }
    setLinkFrom(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-iwos-node");
    if (!kind) return;
    const p = toCanvas(e.clientX, e.clientY);
    onAddNode(kind, p.x - NODE_W / 2, p.y - NODE_H / 2);
  }

  const zoomBy = (delta: number) => setView((v) => ({ ...v, z: Math.min(2, Math.max(0.35, +(v.z + delta).toFixed(2))) }));

  const anchor = (n: WorkflowNode, side: "out" | "in") => ({
    x: n.x + (side === "out" ? NODE_W : 0),
    y: n.y + NODE_H / 2,
  });

  return (
    <div className="relative h-[620px] overflow-hidden rounded-lg border bg-muted/10">
      <div
        ref={wrapRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas === "bg") {
            setPan({ x: e.clientX - view.x, y: e.clientY - view.y });
            onSelect(null);
            setLinkFrom(null);
          }
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          zoomBy(e.deltaY > 0 ? -0.1 : 0.1);
        }}
      >
        <div
          data-canvas="bg"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--muted-foreground) / 0.25) 1px, transparent 1px)",
            backgroundSize: `${GRID * view.z}px ${GRID * view.z}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
        />
        <div
          className="absolute origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
        >
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
            {graph.edges.map((e) => {
              const a = graph.nodes.find((n) => n.id === e.from);
              const b = graph.nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const p1 = anchor(a, "out");
              const p2 = anchor(b, "in");
              const mid = (p1.x + p2.x) / 2;
              return (
                <path
                  key={e.id}
                  d={`M ${p1.x} ${p1.y} C ${mid} ${p1.y}, ${mid} ${p2.y}, ${p2.x} ${p2.y}`}
                  className="stroke-primary/60"
                  strokeWidth={2}
                  fill="none"
                />
              );
            })}
            {linkFrom && cursor && (() => {
              const a = graph.nodes.find((n) => n.id === linkFrom);
              if (!a) return null;
              const p1 = anchor(a, "out");
              return <path d={`M ${p1.x} ${p1.y} L ${cursor.x} ${cursor.y}`} className="stroke-primary" strokeDasharray="4 4" strokeWidth={2} fill="none" />;
            })()}
          </svg>

          {graph.nodes.map((n) => {
            const def = NODE_TYPE_MAP[n.kind];
            const selected = n.id === selectedId;
            return (
              <div
                key={n.id}
                className={cn(
                  "absolute rounded-md border bg-card/90 p-2 shadow-sm backdrop-blur transition-shadow",
                  def.accent,
                  selected && "ring-2 ring-primary",
                )}
                style={{ left: n.x, top: n.y, width: NODE_W, minHeight: n.collapsed ? 34 : NODE_H }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                  const p = toCanvas(e.clientX, e.clientY);
                  setDrag({ id: n.id, dx: p.x - n.x, dy: p.y - n.y });
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkFrom) connect(n.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold">{n.label}</span>
                  <span className="shrink-0 rounded bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {def.kind}
                  </span>
                </div>
                {!n.collapsed && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {String(n.config.event ?? n.config.field ?? n.config.instruction ?? def.description)}
                  </p>
                )}
                <button
                  type="button"
                  aria-label="Start connection"
                  className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border bg-background hover:bg-primary"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkFrom(n.id);
                  }}
                />
                <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border bg-background" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md border bg-background/90 p-1 text-xs backdrop-blur">
        <button className="px-2 py-1 hover:bg-muted" onClick={() => zoomBy(-0.1)} aria-label="Zoom out">−</button>
        <span className="w-12 text-center tabular-nums">{Math.round(view.z * 100)}%</span>
        <button className="px-2 py-1 hover:bg-muted" onClick={() => zoomBy(0.1)} aria-label="Zoom in">+</button>
        <button className="px-2 py-1 hover:bg-muted" onClick={() => setView({ x: 0, y: 0, z: 1 })}>Reset</button>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-3 right-3 h-28 w-44 overflow-hidden rounded-md border bg-background/90 backdrop-blur">
        <svg viewBox="0 0 1600 900" className="h-full w-full">
          {graph.edges.map((e) => {
            const a = graph.nodes.find((n) => n.id === e.from);
            const b = graph.nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-muted-foreground/50" strokeWidth={4} />;
          })}
          {graph.nodes.map((n) => (
            <rect
              key={n.id}
              x={n.x}
              y={n.y}
              width={NODE_W}
              height={NODE_H}
              rx={8}
              className={n.id === selectedId ? "fill-primary" : "fill-muted-foreground/60"}
            />
          ))}
        </svg>
      </div>

      {linkFrom && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md border bg-background/90 px-3 py-1 text-xs backdrop-blur">
          Click a target node to connect · Esc to cancel
        </div>
      )}
    </div>
  );
}
