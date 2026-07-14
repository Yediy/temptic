import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:pl-64 pb-16 md:pb-0">
        <DemoBanner />
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav portal="agency" />
    </div>
  );
}
