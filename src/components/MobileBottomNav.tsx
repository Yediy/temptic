import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AGENCY_MODULES, CLIENT_MODULES, WORKER_MODULES, type ModuleDef, type Portal } from "@/lib/modules";
import { useAccessibleModules } from "@/lib/permissions";

interface Props { portal: Portal }

/** Mobile-only 4-slot bottom nav. Sourced from module registries by mobilePriority. */
export function MobileBottomNav({ portal }: Props) {
  const location = useLocation();
  const { accessibleAgencyModules } = useAccessibleModules();

  const source: ModuleDef[] =
    portal === "agency" ? accessibleAgencyModules :
    portal === "client" ? CLIENT_MODULES :
    WORKER_MODULES;

  const items = source
    .filter((m) => typeof m.mobilePriority === "number")
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border h-14 grid grid-cols-4">
      {items.map((m) => {
        const Icon = m.icon;
        const active = location.pathname === m.path || (m.path !== "/" && location.pathname.startsWith(m.path));
        return (
          <Link key={m.key} to={m.path}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-w-0",
              active ? "text-primary" : "text-muted-foreground",
            )}>
            <Icon className="h-5 w-5" />
            <span className="truncate max-w-full px-1">{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
