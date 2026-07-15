import { Loader2, AlertCircle } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <div className="flex items-start gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Failed to load</p>
        <p className="text-xs opacity-80">{msg}</p>
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground py-4">{label}</p>;
}
