import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicKnowledgeSearch } from "@/hooks/use-woic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/woic/TablePagination";
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
  const [status, setStatus] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const search = useWoicKnowledgeSearch(agencyId ?? undefined, q);

  const all = (search.data as WoicKnowledgeArticle[] | undefined) ?? [];

  const tags = useMemo(
    () => Array.from(new Set(all.flatMap((a) => a.tags ?? []))).sort(),
    [all]
  );

  const filtered = useMemo(
    () =>
      all.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          (tag === "all" || (a.tags ?? []).includes(tag))
      ),
    [all, status, tag]
  );

  const paged = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  return (
    <DataPanel<WoicKnowledgeArticle>
      title="Knowledge Search"
      description="Full-text lookup across published knowledge articles."
      columns={columns}
      rows={search.isLoading ? undefined : paged}
      isLoading={search.isLoading}
      error={search.error}
      emptyLabel={q || status !== "all" || tag !== "all" ? "No matches." : "Enter a query to search."}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search knowledge articles…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            className="w-64"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={(v) => { setTag(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      footer={
        filtered.length > 0 ? (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        ) : null
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
