import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicKnowledgeSearch } from "@/hooks/use-woic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  fmtDate,
} from "@/components/woic/DataPanel";
import type { WoicKnowledgeArticle } from "@/lib/woic/types";

const columns: DataPanelColumn<WoicKnowledgeArticle>[] = [
  { key: "title", header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
  {
    key: "tags",
    header: "Tags",
    cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {(r.tags ?? []).slice(0, 3).map((t) => (
          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
        ))}
      </div>
    ),
  },
  { key: "version", header: "v", cell: (r) => r.version },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>,
  },
  { key: "updated_at", header: "Updated", cell: (r) => fmtDate(r.updated_at) },
];

export default function WoicKnowledge() {
  const { agencyId } = useAuth();
  const [q, setQ] = useState("");
  const search = useWoicKnowledgeSearch(agencyId ?? undefined, q);

  return (
    <DataPanel<WoicKnowledgeArticle>
      title="Knowledge Search"
      description="Full-text lookup across published knowledge articles."
      columns={columns}
      rows={search.data as WoicKnowledgeArticle[] | undefined}
      isLoading={search.isLoading}
      error={search.error}
      emptyLabel={q ? "No matches." : "Enter a query to search."}
      toolbar={
        <Input
          placeholder="Search knowledge articles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
      }
      detailTitle={(r) => r.title}
      renderDetail={(a) => (
        <div className="space-y-1">
          <DetailField label="Status" value={<Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>} />
          <DetailField label="Version" value={`v${a.version}`} />
          <DetailField label="Tags" value={(a.tags ?? []).join(", ") || "—"} />
          <DetailField label="Updated" value={fmtDate(a.updated_at)} />
          <DetailField label="Created" value={fmtDate(a.created_at)} />
        </div>
      )}
    />
  );
}
