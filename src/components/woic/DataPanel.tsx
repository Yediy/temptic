import { ReactNode, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export interface DataPanelColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataPanelProps<T extends { id: string }> {
  title: string;
  description?: string;
  columns: DataPanelColumn<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  error: unknown;
  emptyLabel?: string;
  renderDetail: (row: T) => ReactNode;
  detailTitle?: (row: T) => string;
  toolbar?: ReactNode;
}

export function DataPanel<T extends { id: string }>({
  title,
  description,
  columns,
  rows,
  isLoading,
  error,
  emptyLabel = "No results.",
  renderDetail,
  detailTitle,
  toolbar,
}: DataPanelProps<T>) {
  const [selected, setSelected] = useState<T | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </div>
            {toolbar}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <LoadingState />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && rows?.length === 0 && <EmptyState label={emptyLabel} />}
          {!isLoading && !error && rows && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.className}>{c.cell(row)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{detailTitle ? detailTitle(selected) : "Details"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{renderDetail(selected)}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/50 text-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function DetailJson({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return <DetailField label={label} value={null} />;
  return (
    <div className="py-2 space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="text-xs bg-muted rounded-md p-2 overflow-auto max-h-64">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function short(id: string | null | undefined) {
  return id ? String(id).slice(0, 8) : "—";
}

export function fmtDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function fmtPct(n: number | null | undefined) {
  return typeof n === "number" ? `${(n * 100).toFixed(0)}%` : "—";
}
