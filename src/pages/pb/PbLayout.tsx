import { NavLink, Outlet, useLocation } from "react-router-dom";
import { DollarSign, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canAccessPbPage } from "@/lib/pb/permissions";

const tabs = [
  { to: "/pb", label: "Command Center", end: true },
  { to: "/pb/payroll", label: "Payroll" },
  { to: "/pb/exceptions", label: "Exceptions" },
  { to: "/pb/invoices", label: "Invoices" },
  { to: "/pb/payments", label: "Payments" },
  { to: "/pb/rates", label: "Rate Book" },
  { to: "/pb/commissions", label: "Commissions" },
  { to: "/pb/margin", label: "Margin" },
  { to: "/pb/forecast", label: "Forecast" },
  { to: "/pb/executive", label: "Executive" },
  { to: "/pb/analytics", label: "Analytics" },
  { to: "/pb/compliance", label: "Compliance" },
  { to: "/pb/integrations", label: "Integrations" },
];

export default function PbLayout() {
  const { roles } = useAuth();
  const { pathname } = useLocation();
  const userRoles = (roles ?? []) as string[];
  const visible = tabs.filter((t) => canAccessPbPage(t.to, userRoles));
  const allowed = canAccessPbPage(pathname, userRoles);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Payroll &amp; Billing OS</h1>
      </div>
      <nav className="flex flex-wrap gap-1 border-b overflow-x-auto">
        {visible.map((t) => (
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
      <div>
        {allowed ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-md border p-10 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="font-semibold">You don't have access to this page</p>
            <p className="text-sm text-muted-foreground">Ask an agency admin for payroll or billing permissions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
