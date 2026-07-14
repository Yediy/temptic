import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AGENCY_MODULES, PHASE_LABELS } from "@/lib/modules";

interface Props {
  moduleKey: string;
}

/**
 * Explicit, disclosed placeholder for modules whose full implementation
 * ships in a later phase. This is intentional — the spec forbids mock pages
 * pretending to be finished. The screen tells the user exactly which phase
 * ships this module and links back to a working module.
 */
export function ModulePlaceholder({ moduleKey }: Props) {
  const mod = AGENCY_MODULES.find((m) => m.key === moduleKey);
  const navigate = useNavigate();
  if (!mod) return null;
  const Icon = mod.icon;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Command Center
      </Button>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{mod.label}</CardTitle>
              <Badge variant="secondary" className="mt-1">
                <Sparkles className="w-3 h-3 mr-1" /> {PHASE_LABELS[mod.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This module is part of the Workforce Operating System rollout. The
            database schema, permissions, and navigation entry are already in
            place — the interactive workflows land in the phase noted above so
            each module ships fully connected to real data rather than as a
            placeholder.
          </p>
          <p>
            Nothing in the existing Temp Tic ticket, timecard, PDF, billing, or
            payroll workflow has been removed or renamed. All current data is
            intact.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
