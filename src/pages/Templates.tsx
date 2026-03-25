import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, Settings, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const MASTER_FIELD_KEYS = [
  "ticket_number", "ticket_type", "client_name", "site_name", "site_address",
  "worker_name", "job_title", "work_date", "start_time", "total_hours",
  "regular_hours", "overtime_hours", "ppe_list", "equipment", "notes",
  "supervisor_name", "supervisor_title", "client_signature", "signed_date",
  "week_start_date", "week_end_date",
];

const REQUIRED_FIELDS = ["ticket_number", "client_name", "worker_name", "work_date", "client_signature"];

function UploadTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"daily" | "weekly">("daily");
  const [file, setFile] = useState<File | null>(null);
  const { agencyId } = useAuth();
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async () => {
      if (!agencyId || !name.trim()) throw new Error("Template name is required");

      let sourceUrl: string | null = null;
      if (file) {
        const path = `${agencyId}/templates/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("ticket-assets").upload(path, file, { upsert: true });
        if (error) throw error;
        sourceUrl = path;
      }

      const { error } = await supabase.from("ticket_templates").insert({
        template_name: name.trim(),
        agency_id: agencyId,
        template_scope: scope,
        is_active: false,
        source_file_url: sourceUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created — add field mappings before activating.");
      setOpen(false);
      setName("");
      setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Add Template</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Daily Ticket" className="mt-1" />
          </div>
          <div>
            <Label>Ticket Type</Label>
            <select value={scope} onChange={e => setScope(e.target.value as any)} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <Label>PDF Source File (optional)</Label>
            <Input type="file" accept=".pdf,.html" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Upload a PDF or HTML file to use as the template base.</p>
          </div>
          <Button onClick={() => upload.mutate()} disabled={upload.isPending || !name.trim()} className="w-full">
            {upload.isPending ? "Creating…" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MappingEditor({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: mappings, isLoading } = useQuery({
    queryKey: ["template-mappings", templateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("template_field_mappings").select("*").eq("template_id", templateId).order("field_key");
      if (error) throw error;
      return data;
    },
  });

  const [newField, setNewField] = useState("");
  const [newX, setNewX] = useState("0");
  const [newY, setNewY] = useState("0");

  const addMapping = useMutation({
    mutationFn: async () => {
      if (!newField) throw new Error("Select a field");
      const { error } = await supabase.from("template_field_mappings").insert({
        template_id: templateId,
        field_key: newField,
        x: Number(newX),
        y: Number(newY),
        field_type: "text",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template-mappings", templateId] });
      setNewField("");
      setNewX("0");
      setNewY("0");
      toast.success("Field mapping added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("template_field_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template-mappings", templateId] });
      toast.success("Mapping removed");
    },
  });

  const usedKeys = new Set(mappings?.map(m => m.field_key) ?? []);
  const availableKeys = MASTER_FIELD_KEYS.filter(k => !usedKeys.has(k));
  const missingRequired = REQUIRED_FIELDS.filter(k => !usedKeys.has(k));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Field Mappings</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* Readiness indicator */}
      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Missing required fields
          </div>
          <p>Add mappings for: {missingRequired.join(", ")}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {mappings?.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                {REQUIRED_FIELDS.includes(m.field_key) && (
                  <span className="text-[10px] font-semibold text-destructive uppercase">req</span>
                )}
                <span className="font-mono text-xs">{m.field_key}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">x:{m.x} y:{m.y} page:{m.page_number}</span>
                <button onClick={() => deleteMapping.mutate(m.id)} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {(!mappings || mappings.length === 0) && (
            <p className="text-xs text-muted-foreground">No field mappings yet. Add the required fields below.</p>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Field</Label>
          <select value={newField} onChange={e => setNewField(e.target.value)} className="w-full rounded-lg border bg-card px-2 py-1.5 text-sm mt-1">
            <option value="">Select field…</option>
            {availableKeys.map(k => (
              <option key={k} value={k}>
                {k}{REQUIRED_FIELDS.includes(k) ? " (required)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="w-16">
          <Label className="text-xs">X</Label>
          <Input value={newX} onChange={e => setNewX(e.target.value)} type="number" className="mt-1 h-8 text-xs" />
        </div>
        <div className="w-16">
          <Label className="text-xs">Y</Label>
          <Input value={newY} onChange={e => setNewY(e.target.value)} type="number" className="mt-1 h-8 text-xs" />
        </div>
        <Button size="sm" onClick={() => addMapping.mutate()} disabled={addMapping.isPending || !newField}>Add</Button>
      </div>
    </div>
  );
}

export default function Templates() {
  const { agencyId } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_templates")
        .select("*, template_field_mappings(field_key)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive, mappingCount }: { id: string; isActive: boolean; mappingCount: number }) => {
      // If activating, check required field mappings
      if (!isActive) {
        const { data: mappings } = await supabase
          .from("template_field_mappings")
          .select("field_key")
          .eq("template_id", id);
        const mapped = new Set(mappings?.map(m => m.field_key) ?? []);
        const missing = REQUIRED_FIELDS.filter(k => !mapped.has(k));
        if (missing.length > 0) {
          throw new Error(`Cannot activate: missing required field mappings — ${missing.join(", ")}`);
        }
      }
      const { error } = await supabase.from("ticket_templates").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage ticket PDF templates and field mappings.</p>
        </div>
        <UploadTemplateDialog />
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : !templates?.length ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No templates yet. Create your first template to get started.</p>
          </div>
        ) : (
          templates.map(t => {
            const mappingCount = (t as any).template_field_mappings?.length ?? 0;
            const mapped = new Set(((t as any).template_field_mappings ?? []).map((m: any) => m.field_key));
            const missingRequired = REQUIRED_FIELDS.filter(k => !mapped.has(k));
            const isReady = missingRequired.length === 0;

            return (
              <div key={t.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{t.template_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-secondary-foreground">
                        {t.template_scope}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {t.is_active ? (
                          <><CheckCircle2 className="h-3 w-3" /> Active</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Inactive</>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {mappingCount} field{mappingCount !== 1 ? "s" : ""} mapped
                      </span>
                      {!isReady && !t.is_active && (
                        <span className="text-[10px] text-orange-500 font-medium">
                          {missingRequired.length} required field{missingRequired.length !== 1 ? "s" : ""} missing
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={t.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: t.id, isActive: t.is_active, mappingCount })}
                      disabled={toggleActive.isPending}
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(editingId === t.id ? null : t.id)}>
                      <Settings className="mr-1 h-3 w-3" /> Mappings
                    </Button>
                  </div>
                </div>
                {editingId === t.id && (
                  <MappingEditor templateId={t.id} onClose={() => setEditingId(null)} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
