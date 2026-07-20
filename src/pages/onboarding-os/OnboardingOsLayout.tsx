import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/onboarding-os", label: "Dashboard", end: true },
  { to: "/onboarding-os/tasks", label: "Tasks" },
  { to: "/onboarding-os/readiness", label: "Readiness" },
  { to: "/onboarding-os/requirements", label: "Client Requirements" },
  { to: "/onboarding-os/assistant", label: "AI Assistant" },
];

export default function OnboardingOsLayout() {
  return (
    <div className="flex flex-col">
      <header className="border-b px-4 md:px-6 pt-4">
        <div className="mb-3">
          <h1 className="text-2xl font-semibold">Onboarding OS</h1>
          <p className="text-sm text-muted-foreground">
            Reusable workforce onboarding powered by WOIC & TTOS. Complete once, reuse everywhere.
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm border-b-2 whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
