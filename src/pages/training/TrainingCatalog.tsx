import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCourses } from "@/hooks/use-training";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, GraduationCap, ShieldAlert } from "lucide-react";

export default function TrainingCatalog() {
  const { agencyId } = useAuth();
  const { data: courses, isLoading } = useCourses(agencyId ?? undefined);
  const navigate = useNavigate();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading catalog…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Training</h1>
        <p className="text-sm text-muted-foreground">Courses assigned to your workers. Required courses gate assignment clearance.</p>
      </div>

      {(courses?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No training courses yet. Create one to begin building your LMS catalog.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses!.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="w-4 h-4" />
                  <span className="truncate">{c.title}</span>
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {c.required && (
                    <Badge variant="destructive" className="text-xs"><ShieldAlert className="w-3 h-3 mr-1" />Required</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs capitalize">{c.status}</Badge>
                  {c.category && <Badge variant="outline" className="text-xs">{c.category}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{c.description ?? "No description."}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" /> {c.duration_minutes} min
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/training/${c.id}`)}>Open</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
