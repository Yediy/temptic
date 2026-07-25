import { NavLink, Outlet } from "react-router-dom";
import { Clock } from "lucide-react";

const tabs = [
  { to: "/tto", label: "Dashboard", end: true },
  { to: "/tto/live", label: "Live Labor" },
  { to: "/tto/approvals", label: "Approvals" },
  { to: "/tto/corrections", label: "Corrections" },
  { to: "/tto/payroll", label: "Payroll" },
  { to: "/tto/billing", label: "Billing" },
  { to: "/tto/analytics", label: "Analytics" },
  { to: "/tto/audit", label: "Audit" },
  { to: "/tto/worker", label: "Worker Center" },
];

export default function TtoLayout() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Digital Time Ticket OS</h1>
      </div>
      <nav className="flex flex-wrap gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-3 py-2 text-sm rounded-t-md whitespace-nowrap ${isActive ? "border-b-2 border-primary font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div><Outlet /></div>
    </div>
  );
}
