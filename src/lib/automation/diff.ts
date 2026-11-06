export type FieldChange = { field: string; before: unknown; after: unknown };

const stable = (v: unknown): string => {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
};

/** Top-level field differences between two rule snapshots (key order ignored). */
export function diffSnapshots(before: Record<string, unknown> | null, after: Record<string, unknown>): FieldChange[] {
  const prev = before ?? {};
  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(after)])).sort();
  return keys
    .filter((k) => stable(prev[k]) !== stable(after[k]))
    .map((k) => ({ field: k, before: prev[k] ?? null, after: after[k] ?? null }));
}

/** Rollback is only allowed to a strictly earlier, non-delete version. */
export function canRollbackTo(target: { version: number; change_kind: string }, currentVersion: number | null): boolean {
  return currentVersion !== null && target.version < currentVersion && target.change_kind !== "delete";
}
