import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64">
        <DemoBanner />
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
