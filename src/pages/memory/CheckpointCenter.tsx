import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CapabilityState, CheckpointBadge, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice,
  RecordTable, usePagedRows,
} from "@/components/memory/MemBits";
import {
  useMemoryControl, useMemoryList, useMemoryPermissions, useMemorySettings, useRowFilter,
} from "@/hooks/memory/use-memory";
import { asRecord, formatBytes, formatTime, str } from "@/lib/memory/platform";

/**
 * Checkpoints live entirely in the Phase 6.2A backend. This page lists them and
 * requests create/restore; it never serializes, stores or restores state locally.
 */
export default function CheckpointCenter() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const perms = useMemoryPermissions();

  const list = useMemoryList("memory.checkpoints.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const create = useMemoryControl("memory.checkpoint.create");
  const restore = useMemoryControl("memory.checkpoint.restore");
  const detail = asRecord(selected);

  const onCreate = () => {
    if (!sessionId.trim()) { toast.error("Enter the session to checkpoint."); return; }
    create.mutateAsync({ session_id: sessionId.trim() })
      .then(() => toast.success("Checkpoint requested from WOIC."))
      .catch((e: Error) => toast.error(e.message || "Checkpoint was not accepted."));
  };

  const onRestore = () => {
    const id = str(detail.id ?? detail.checkpoint_id);
    if (!id) return;
    restore.mutateAsync({ checkpoint_id: id })
      .then(() => toast.success("Restoration requested — WOIC performs the restore."))
      .catch((e: Error) => toast.error(e.message || "Restoration was not accepted."));
  };

  return (
    <div className="space-y-4">
      <Panel title="Checkpoint Center" description="Backend-persisted cognitive state checkpoints. Creation and restoration are executed by WOIC.">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="cp-session" className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
              Session
            </label>
            <Input
              id="cp-session"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session id"
              className="h-8 w-72 font-mono text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!perms.can("memory.checkpoint.create") || create.isPending}
            title={perms.can("memory.checkpoint.create") ? undefined : "Your role is not permitted to create checkpoints."}
            onClick={onCreate}
          >
            Create Checkpoint
          </Button>
        </div>

        <CapabilityState status={list.status} message={list.message} label="cognitive checkpoints">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter checkpoints…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "label", label: "Checkpoint", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.label ?? r.name ?? r.id, "(unnamed checkpoint)")}
                </button>
              ) },
              { key: "session_id", label: "Session", render: (r) => str(r.session_id, "—") },
              { key: "created_at", label: "Created", render: (r) => formatTime(r.created_at) },
              { key: "reason", label: "Reason", render: (r) => str(r.reason, "—") },
              { key: "state_version", label: "State Version", render: (r) => str(r.state_version, "—") },
              { key: "memory_size", label: "Memory Size", render: (r) => formatBytes(r.memory_size_bytes ?? r.memory_size) },
              { key: "status", label: "Status", render: (r) => <CheckpointBadge value={r.status} /> },
            ]}
            empty="No checkpoints were reported by the Working Memory API."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Checkpoint Detail" description="Restoration is always performed by the backend. No local restoration path exists.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Checkpoint", detail.label ?? detail.name ?? detail.id],
              ["Session", detail.session_id],
              ["Created", detail.created_at],
              ["Reason", detail.reason],
              ["State Version", detail.state_version],
              ["Memory Size", detail.memory_size_bytes ?? detail.memory_size],
              ["Status", detail.status],
              ["Contents Summary", detail.contents_summary],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                <MetadataBlock value={value} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!perms.canRestoreCheckpoint || restore.isPending}
              title={perms.canRestoreCheckpoint ? undefined : "Checkpoint restoration requires super admin authority."}
              onClick={onRestore}
            >
              Restore Checkpoint
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Sends a governed restore request to the Phase 6.2A API.
            </span>
          </div>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
