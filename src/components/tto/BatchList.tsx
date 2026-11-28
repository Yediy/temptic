import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type Batch = Record<string, unknown> & { id: string; totals?: Record<string, unknown> | null; ticket_ids?: string[] | null };

export function BatchList({ kind, batches, onReview }: { kind: "payroll" | "billing"; batches: Batch[]; onReview?:(id:string)=>void }) {
  const qc = useQueryClient();
  const exportBatch = useMutation({
    mutationFn: async (batch_id: string) => {
      const { data, error } = await supabase.functions.invoke("tto-export-batch", { body: { kind, batch_id } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as { context: Response }).context.json()).error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [`tto-${kind}-batches`] });
      qc.invalidateQueries({ queryKey: ["tto-payroll-review"] });
      toast.success("Export file ready");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  const download = async (b: Batch) => {
    const name = `${kind}-${String(b.period_start)}.csv`;
    const { data, error } = await supabase.storage.from("tto-exports").createSignedUrl(String(b.file_path), 60, { download: name });
    if (error || !data) return toast.error("File unavailable");
    window.location.assign(data.signedUrl);
  };

  if (!batches.length) return <p className="border-y py-6 text-center text-sm text-muted-foreground">No payroll batches yet.</p>;

  return (
    <div className="space-y-2">
      {batches.map((b) => {
        const t = b.totals ?? {};
        const count = (b.ticket_ids ?? []).length;
        const open = b.status === "open";
        return (
          <Card key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">{String(b.name)}</div>
              <div className="text-xs text-muted-foreground">
                {String(b.period_start)} – {String(b.period_end)} · {count} ticket{count === 1 ? "" : "s"}
                {t.grand_total != null && ` · ${Number(t.grand_total).toFixed(2)} ${String(t.currency ?? "USD")}`}
                {b.exported_at ? ` · exported ${new Date(String(b.exported_at)).toLocaleString()}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={open ? "outline" : "secondary"}>{open ? "collecting" : String(b.status)}</Badge>
              {onReview&&<Button size="sm" variant="outline" onClick={()=>onReview(b.id)}>Review</Button>}
              {(kind!=="payroll"||b.status!=="exported")&&<Button size="sm" variant="outline" disabled={exportBatch.isPending || count === 0 || (kind==="payroll"&&(!b.pay_date||b.status==="exporting"))} onClick={() => exportBatch.mutate(b.id)}>
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />{b.file_path ? "Regenerate" : "Generate export"}
              </Button>}
              {b.file_path && <Button size="sm" onClick={() => download(b)}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
