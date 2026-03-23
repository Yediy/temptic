import { useState } from "react";
import { HardHat, ShieldCheck, Plus } from "lucide-react";
import { useWorkers, useCreateWorker } from "@/hooks/use-agency-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function AddWorkerDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", worker_code: "", trade: "", classification: "", phone: "", email: "",
  });
  const createWorker = useCreateWorker();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorker.mutateAsync(form);
      toast.success("Worker added");
      setOpen(false);
      setForm({ first_name: "", last_name: "", worker_code: "", trade: "", classification: "", phone: "", email: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <HardHat className="mr-1 h-4 w-4" />
          Add Worker
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Worker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Worker Code</Label>
            <Input value={form.worker_code} onChange={e => setForm({ ...form, worker_code: e.target.value })} placeholder="W-1001" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Trade</Label>
              <Input value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })} placeholder="Electrician" className="mt-1" />
            </div>
            <div>
              <Label>Classification</Label>
              <Input value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })} placeholder="Journeyman" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="mt-1" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createWorker.isPending}>
            {createWorker.isPending ? "Adding…" : "Add Worker"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Workers() {
  const { data: workers, isLoading } = useWorkers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${workers?.length ?? 0} registered workers`}
          </p>
        </div>
        <AddWorkerDialog />
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
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : workers?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No workers yet. Add your first worker.</td></tr>
              ) : (
                workers?.map((worker) => (
                  <tr key={worker.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{worker.worker_code || "—"}</td>
                    <td className="px-4 py-3 font-medium">{worker.first_name} {worker.last_name}</td>
                    <td className="px-4 py-3">{worker.trade || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{worker.classification || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{worker.phone || "—"}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
