import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { COMMS_SECTIONS } from "@/lib/comms/fabric";
import { useUnifiedInbox } from "@/hooks/comms/use-comms";

export default function CommsLayout() {
  const { unreadCount } = useUnifiedInbox();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 5.6B</p>
        <h1 className="text-3xl font-semibold tracking-tight">Unified Communications</h1>
        <p className="text-sm text-muted-foreground">
          Every message, notification, approval and AI conversation across IWOS in one intelligent workspace.
          {unreadCount > 0 && <span className="ml-1 font-medium text-foreground">{unreadCount} unread.</span>}
        </p>
      </header>

      <nav aria-label="Communications sections" className="flex flex-wrap gap-1 border-b">
        {COMMS_SECTIONS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-b-2 border-primary bg-muted/30 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
