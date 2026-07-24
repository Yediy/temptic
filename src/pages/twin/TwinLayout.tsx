import { NavLink, Outlet, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkerTwin, useRecomputeTwin } from "@/hooks/use-twin";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Brain } from "lucide-react";

const tabs = [
  { to: "", label: "Dashboard", end: true },
  { to: "capabilities", label: "Capabilities" },
  { to: "predictions", label: "Predictions" },
  { to: "career", label: "Career Sim" },
  { to: "assignments", label: "Assignment Sim" },
  { to: "coaching", label: "Coaching" },
  { to: "growth", label: "Growth Plan" },
  { to: "timeline", label: "Timeline" },
  { to: "knowledge", label: "Knowledge Graph" },
  { to: "organization", label: "Organization" },
];

export default function TwinLayout() {
  const { workerId } = useParams<{ workerId: string }>();
  const { agencyId } = useAuth();
  const twin = useWorkerTwin(workerId);
  const recompute = useRecomputeTwin();

  const worker = useQuery({
    queryKey: ["twin", "worker_meta", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workers")
        .select("first_name, last_name")
        .eq("id", workerId!)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Digital Worker Twin</p>
            <h1 className="text-lg font-semibold">
              {worker.data ? `${worker.data.first_name ?? ""} ${worker.data.last_name ?? ""}`.trim() : "Worker"}
            </h1>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!workerId || !agencyId || recompute.isPending}
          onClick={() => workerId && agencyId && recompute.mutate({ worker_id: workerId, agency_id: agencyId })}
        >
          {recompute.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
          Recompute Twin
        </Button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ workerId, twinId: twin.data?.id as string | undefined, twin: twin.data }} />
    </div>
  );
}
