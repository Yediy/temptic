import { HardHat, Phone, ShieldCheck } from "lucide-react";
import { mockWorkers } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function Workers() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground">{mockWorkers.length} registered workers</p>
        </div>
        <Button>
          <HardHat className="mr-1 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trade</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Classification</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">OSHA</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockWorkers.map((worker) => (
                <tr key={worker.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{worker.worker_code}</td>
                  <td className="px-4 py-3 font-medium">{worker.first_name} {worker.last_name}</td>
                  <td className="px-4 py-3">{worker.trade}</td>
                  <td className="px-4 py-3 text-muted-foreground">{worker.classification}</td>
                  <td className="px-4 py-3 text-muted-foreground">{worker.phone}</td>
                  <td className="px-4 py-3">
                    {worker.osha_cert ? (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      worker.is_active 
                        ? "bg-success/15 text-success" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {worker.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
