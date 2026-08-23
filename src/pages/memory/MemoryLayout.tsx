import { NavLink, Outlet } from "react-router-dom";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/memory/MemBits";

const tabs = [
  { to: "/memory", label: "Memory Overview", end: true },
  { to: "/memory/sessions", label: "Active Sessions" },
  { to: "/memory/state", label: "Cognitive State" },
  { to: "/memory/items", label: "Memory Items" },
  { to: "/memory/goals", label: "Goals & Subgoals" },
  { to: "/memory/questions", label: "Open Questions" },
  { to: "/memory/hypotheses", label: "Hypotheses" },
  { to: "/memory/evidence", label: "Evidence" },
  { to: "/memory/checkpoints", label: "Checkpoints" },
  { to: "/memory/compression", label: "Compression" },
  { to: "/memory/lifecycle", label: "Memory Lifecycle" },
  { to: "/memory/budgets", label: "Budgets" },
  { to: "/memory/health", label: "Health" },
];

export default function MemoryLayout() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Layers className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Working Memory</h1>
          <p className="text-sm text-muted-foreground">
            What WOIC currently holds in active memory, why it is retained, what was compressed, what was
            evicted, and how much cognitive budget remains.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        <p>
          All working-memory logic — compression, eviction, scoring, checkpointing, state merging and
          promotion — is performed by WOIC (Phase 6.2A). This workspace observes and requests only; it holds no
          local memory engine, no local checkpoint store, and never displays private reasoning.
        </p>
        <ContractChips />
      </div>

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="Working memory sections">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
