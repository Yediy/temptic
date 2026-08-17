import { NavLink, Outlet } from "react-router-dom";
import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/architecture/ArchBits";
import { useArchSettings } from "@/hooks/architecture/use-architecture";

const sections: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/architecture", label: "Overview", end: true },
  { to: "/architecture/organisms", label: "Platform Organisms" },
  { to: "/architecture/layers", label: "Platform Layers" },
  { to: "/architecture/domains", label: "Platform Domains" },
  { to: "/architecture/dependencies", label: "Dependency Explorer" },
  { to: "/architecture/data-ownership", label: "Data Ownership" },
  { to: "/architecture/apis", label: "API Catalog" },
  { to: "/architecture/events", label: "Event Catalog" },
  { to: "/architecture/permissions", label: "Permission Registry" },
  { to: "/architecture/contracts", label: "Platform Contracts" },
  { to: "/architecture/capspecs", label: "Capability Specs" },
  { to: "/architecture/dna", label: "Platform DNA" },
  { to: "/architecture/adrs", label: "ADRs" },
  { to: "/architecture/constitution", label: "Constitution" },
  { to: "/architecture/versions", label: "Versions" },
  { to: "/architecture/compatibility", label: "Compatibility" },
  { to: "/architecture/health", label: "Architecture Health" },
  { to: "/architecture/impact", label: "Change Impact" },
  { to: "/architecture/debt", label: "Technical Debt" },
  { to: "/architecture/ip", label: "IP Register" },
  { to: "/architecture/search", label: "Engineer Search" },
  { to: "/architecture/settings", label: "Settings" },
];

export default function ArchitectureLayout() {
  const [settings] = useArchSettings();

  return (
    <div className={cn("p-4 md:p-6", settings.density === "dense" ? "space-y-3" : "space-y-5")}>
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Boxes className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Architecture &amp; Governance</h1>
          <p className="text-sm text-muted-foreground">
            The engineering map of the operating system — organisms, dependencies, contracts, data, events and governance.
          </p>
        </div>
        <ContractChips />
      </header>

      <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        Every record shown here is read from the canonical Phase 5.10A Architecture Registry. This console holds no
        architecture database of its own, performs no dependency analysis and stores no contracts. Change impact is
        analysis only — no architectural change is approved here.
      </p>

      <div className="flex flex-col gap-4 lg:flex-row">
        <nav
          className="shrink-0 overflow-x-auto lg:overflow-visible"
          style={{ width: undefined }}
          aria-label="Architecture sections"
        >
          <ul className="flex gap-1 lg:flex-col" style={{ width: `min(100%, ${settings.treeWidth}px)` }}>
            {sections.map((s) => (
              <li key={s.to}>
                <NavLink
                  to={s.to}
                  end={s.end}
                  className={({ isActive }) => cn(
                    "block whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors lg:whitespace-normal",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-3">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
