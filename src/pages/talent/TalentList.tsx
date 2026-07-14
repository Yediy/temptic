import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkers } from "@/hooks/use-agency-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface WorkerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  classification: string | null;
  is_active: boolean;
  worker_profiles: { completion_score: number; general_location: string | null; trade_specialties: string[] | null } | null;
}

export default function TalentList() {
  const { agencyId } = useAuth();
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["talent-list", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, first_name, last_name, email, phone, classification, is_active, worker_profiles(completion_score, general_location, trade_specialties)")
        .eq("agency_id", agencyId!)
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as unknown as WorkerRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const needle = q.toLowerCase();
    return data.filter((w) =>
      `${w.first_name} ${w.last_name} ${w.email} ${w.worker_profiles?.trade_specialties?.join(" ") ?? ""}`.toLowerCase().includes(needle),
    );
  }, [data, q]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Talent
          </h1>
          <p className="text-sm text-muted-foreground">Workforce Passport for every worker across your agency.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/workers"><Plus className="w-4 h-4 mr-1" /> Add worker</Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, or trade…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {data.length === 0 ? "No workers yet. Add one from the Workers page." : "No workers match this search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => {
            const score = w.worker_profiles?.completion_score ?? 0;
            return (
              <Link key={w.id} to={`/talent/${w.id}`}>
                <Card className="hover:border-primary transition-colors h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {w.first_name} {w.last_name}
                      </CardTitle>
                      <Badge variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "outline"}>{score}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{w.email}</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {(w.worker_profiles?.trade_specialties ?? []).slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{w.worker_profiles?.general_location || "Location not set"}</span>
                      {!w.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
