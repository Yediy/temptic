import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { HardHat, FileText, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "My Tickets", icon: FileText, path: "/worker" },
  { label: "My Hours", icon: Clock, path: "/worker/hours" },
];

export function WorkerLayout() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Temp Tic <span className="text-muted-foreground font-normal">Worker</span></span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
