import { Outlet, NavLink, useParams } from "react-router-dom";
import { PASSPORT_TABS } from "@/lib/passport/types";
import { cn } from "@/lib/utils";

export default function PassportLayout() {
  const { passportId } = useParams();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Workforce Passport</h1>
        <p className="text-sm text-muted-foreground">Your permanent digital workforce identity.</p>
      </header>
      <nav className="flex flex-wrap gap-1 border-b">
        {PASSPORT_TABS.map((t) => (
          <NavLink
            key={t.key}
            end={t.path === ""}
            to={t.path === "" ? `/passport/${passportId}` : `/passport/${passportId}/${t.path}`}
            className={({ isActive }) =>
              cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
