import { useParams } from "react-router-dom";
import { useRef } from "react";
import { useCcDocuments, useUploadCcDocument } from "@/hooks/cc/use-client-collab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DocumentCenter() {
  const { clientId } = useParams();
  const { data } = useCcDocuments(clientId);
  const upload = useUploadCcDocument();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div>
          <input ref={inputRef} type="file" hidden onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && clientId) upload.mutate({ client_id: clientId, file });
          }} />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
          </Button>
        </div>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                v{d.version} · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="outline">{d.category}</Badge>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-sm text-muted-foreground">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}
