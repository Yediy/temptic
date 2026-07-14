import { useState } from "react";
import { Link } from "react-router-dom";
import { useJobOrders, useCreateJobOrder, type JobOrderStatus } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<JobOrderStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/10 text-primary",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  filled: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
};

export default function JobBoard() {
  const { data: jobs, isLoading, error } = useJobOrders();
  const create = useCreateJobOrder();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", positions_needed: 1, location: "", industry: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        description: form.description || undefined,
        positions_needed: Number(form.positions_needed) || 1,
        location: form.location || undefined,
        industry: form.industry || undefined,
      });
      toast.success("Job order created");
      setOpen(false);
      setForm({ title: "", description: "", positions_needed: 1, location: "", industry: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-muted-foreground">Manage job orders and candidate pipeline.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Job Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Job Order</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="positions">Positions Needed</Label>
                  <Input id="positions" type="number" min={1} value={form.positions_needed} onChange={(e) => setForm({ ...form, positions_needed: Number(e.target.value) })} />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading job orders…</div>}
      {error && <div className="text-sm text-destructive">Failed to load: {String(error)}</div>}
      {!isLoading && !error && jobs?.length === 0 && (
        <Card className="p-8 text-center">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No job orders yet</p>
          <p className="text-sm text-muted-foreground">Create your first job order to start sourcing candidates.</p>
        </Card>
      )}

      <div className="grid gap-3">
        {jobs?.map((job) => (
          <Link key={job.id} to={`/jobs/${job.id}`} className="block">
            <Card className="p-4 hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{job.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {job.location && <span>{job.location}</span>}
                    {job.industry && <span>{job.industry}</span>}
                    <span>{job.positions_filled}/{job.positions_needed} filled</span>
                  </div>
                </div>
                <Badge className={STATUS_COLORS[job.status] ?? ""}>{job.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
