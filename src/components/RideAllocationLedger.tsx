import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RideEvent, RideSnapshotAllocation, RideSnapshotAllocationDraft } from "@/lib/types";
import { formatCurrency } from "@/lib/store";

type DraftRow = RideSnapshotAllocationDraft & { key: string };

function toDraft(row: RideSnapshotAllocation): DraftRow {
  return {
    key: row.id,
    rideEventId: row.rideEventId ?? null,
    kind: row.kind,
    amount: row.amount,
    observedAt: row.observedAt,
    attributedDayDate: row.attributedDayDate,
    shiftId: row.shiftId,
    effectiveStartAt: row.effectiveStartAt,
    effectiveEndAt: row.effectiveEndAt,
    note: row.note,
  };
}

export default function RideAllocationLedger({ allocations, rides, currencySymbol, onReplace }: {
  allocations: RideSnapshotAllocation[];
  rides: RideEvent[];
  currencySymbol: string;
  onReplace: (snapshotId: string, rows: RideSnapshotAllocationDraft[]) => Promise<boolean>;
}) {
  const groups = useMemo(() => {
    const bySnapshot = new Map<string, RideSnapshotAllocation[]>();
    allocations.filter((row) => row.isCurrent).forEach((row) => bySnapshot.set(row.earningsSnapshotId, [...(bySnapshot.get(row.earningsSnapshotId) ?? []), row]));
    return [...bySnapshot.entries()].sort(([, a], [, b]) => b[0].observedAt.localeCompare(a[0].observedAt));
  }, [allocations]);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  if (!groups.length) return null;

  function beginEdit(snapshotId: string, rows: RideSnapshotAllocation[]) {
    setEditingSnapshotId(snapshotId);
    setDraftRows(rows.map(toDraft));
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setDraftRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  async function save(snapshotId: string) {
    const rows = draftRows.map(({ key: _key, ...row }) => row).filter((row) => row.amount > 0);
    if (!rows.length) return;
    setSaving(true);
    try {
      if (await onReplace(snapshotId, rows)) setEditingSnapshotId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold">Ride allocation ledger</p>
        <p className="text-xs text-muted-foreground">Edit where an observed update belongs without changing the original daily total or snapshot.</p>
      </div>
      {groups.map(([snapshotId, rows]) => {
        const total = rows.reduce((sum, row) => sum + row.amount, 0);
        const editing = editingSnapshotId === snapshotId;
        const draftTotal = draftRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        return <div key={snapshotId} className="rounded-lg border border-border bg-background/55 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Observed {new Date(rows[0].observedAt).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(total, currencySymbol)} allocated</p>
            </div>
            {!editing && <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(snapshotId, rows)}>Edit</Button>}
          </div>
          {!editing ? rows.map((row) => {
            const ride = row.rideEventId ? rides.find((item) => item.id === row.rideEventId) : null;
            return <p key={row.id} className="text-xs text-muted-foreground">{formatCurrency(row.amount, currencySymbol)} · {ride ? `${ride.app ?? "Ride"} · ${ride.dayDate}` : row.kind === "unassigned" ? "Unassigned for review" : "Update interval"}</p>;
          }) : <>
            {draftRows.map((row) => <div key={row.key} className="grid grid-cols-[1fr_92px_auto] gap-2">
              <select className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={row.rideEventId ?? "unassigned"} onChange={(event) => {
                const rideEventId = event.target.value === "unassigned" ? null : event.target.value;
                updateRow(row.key, { rideEventId, kind: rideEventId ? (row.kind === "unassigned" || row.kind === "update_interval" ? "ride_base" : row.kind) : "unassigned" });
              }}>
                <option value="unassigned">Unassigned / interval</option>
                {rides.filter((ride) => ride.status !== "active" && ride.app).map((ride) => <option key={ride.id} value={ride.id}>{ride.app} · {ride.dayDate} · {new Date(ride.endedAt ?? ride.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}
              </select>
              <Input type="number" min="0" step="0.01" className="h-10 text-right font-mono" value={row.amount} onChange={(event) => updateRow(row.key, { amount: Math.max(0, Number(event.target.value) || 0) })} />
              <Button type="button" size="sm" variant="ghost" className="h-10 px-2" onClick={() => setDraftRows((items) => items.filter((item) => item.key !== row.key))}>Remove</Button>
            </div>)}
            <Button type="button" size="sm" variant="secondary" onClick={() => setDraftRows((rows) => [...rows, { key: crypto.randomUUID(), kind: "unassigned", amount: 0, observedAt: rows[0]?.observedAt ?? new Date().toISOString() }])}>Add portion</Button>
            <p className={Math.abs(draftTotal - total) > 0.005 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>Parts must total {formatCurrency(total, currencySymbol)}. Current: {formatCurrency(draftTotal, currencySymbol)}.</p>
            <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditingSnapshotId(null)}>Cancel</Button><Button type="button" size="sm" disabled={saving || Math.abs(draftTotal - total) > 0.005 || draftRows.some((row) => row.amount <= 0)} onClick={() => save(snapshotId)}>{saving ? "Saving…" : "Save allocation"}</Button></div>
          </>}
        </div>;
      })}
    </section>
  );
}
