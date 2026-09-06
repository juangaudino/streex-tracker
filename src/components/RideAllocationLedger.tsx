import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EarningsSnapshot, RideEvent, RideSnapshotAllocation, RideSnapshotAllocationDraft } from "@/lib/types";
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

export default function RideAllocationLedger({ allocations, rides, snapshots, weekId, currencySymbol, onReplace }: {
  allocations: RideSnapshotAllocation[];
  rides: RideEvent[];
  snapshots: EarningsSnapshot[];
  weekId: string;
  currencySymbol: string;
  onReplace: (snapshotId: string, rows: RideSnapshotAllocationDraft[]) => Promise<boolean>;
}) {
  const reviewItems = useMemo(() => {
    const bySnapshot = new Map<string, RideSnapshotAllocation[]>();
    allocations.filter((row) => row.isCurrent).forEach((row) => bySnapshot.set(row.earningsSnapshotId, [...(bySnapshot.get(row.earningsSnapshotId) ?? []), row]));
    return snapshots
      .filter((snapshot) => snapshot.weekId === weekId && Number(snapshot.delta) > 0)
      .map((snapshot) => ({ snapshot, rows: bySnapshot.get(snapshot.id) ?? [] }))
      .sort((a, b) => b.snapshot.createdAt.localeCompare(a.snapshot.createdAt));
  }, [allocations, snapshots, weekId]);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  if (!reviewItems.length) return null;

  function beginEdit(snapshot: EarningsSnapshot, rows: RideSnapshotAllocation[]) {
    const initialRows = rows.length ? rows.map(toDraft) : [{
      key: crypto.randomUUID(), kind: "unassigned" as const, amount: Number(snapshot.delta), observedAt: snapshot.createdAt,
      attributedDayDate: snapshot.dayDate, shiftId: snapshot.shiftId ?? null, note: "Not yet assigned to a specific ride.",
    }];
    setEditingSnapshotId(snapshot.id);
    setDraftRows(initialRows);
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
        <p className="text-sm font-semibold">Weekly ride allocation review</p>
        <p className="text-xs text-muted-foreground">Every positive Uber update for this week is shown here, including ones not assigned yet. Edit the ride-level interpretation without changing the original total or snapshot.</p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground"><span className="font-semibold text-foreground">What Streex verifies:</span> the observed update, the selected ride, and that all portions add up exactly. <span className="font-semibold text-foreground">What you confirm:</span> the actual Uber amount for each ride.</div>
      {reviewItems.map(({ snapshot, rows }) => {
        const total = Number(snapshot.delta);
        const assigned = rows.filter((row) => row.rideEventId).reduce((sum, row) => sum + row.amount, 0);
        const unassigned = Math.max(0, total - assigned);
        const editing = editingSnapshotId === snapshot.id;
        const draftTotal = draftRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        const reviewRides = rides.filter((ride) => ride.status !== "active" && ride.app === snapshot.app);
        return <div key={snapshot.id} className="rounded-lg border border-border bg-background/55 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">{snapshot.app} +{formatCurrency(total, currencySymbol)} observed {new Date(snapshot.createdAt).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Ride-assigned {formatCurrency(assigned, currencySymbol)} · Remaining {formatCurrency(unassigned, currencySymbol)}</p>
            </div>
            {!editing && <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(snapshot, rows)}>{rows.length ? "Review" : "Assign rides"}</Button>}
          </div>
          {!editing && rows.length === 0 && <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">No ride amount confirmed yet. Choose “Assign rides” during your weekly review.</p>}
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
                {reviewRides.map((ride) => <option key={ride.id} value={ride.id}>{ride.app} · {ride.dayDate} · {new Date(ride.endedAt ?? ride.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}
              </select>
              <Input type="number" min="0" step="0.01" className="h-10 text-right font-mono" value={row.amount} onChange={(event) => updateRow(row.key, { amount: Math.max(0, Number(event.target.value) || 0) })} />
              <Button type="button" size="sm" variant="ghost" className="h-10 px-2" onClick={() => setDraftRows((items) => items.filter((item) => item.key !== row.key))}>Remove</Button>
            </div>)}
            <Button type="button" size="sm" variant="secondary" onClick={() => setDraftRows((rows) => [...rows, { key: crypto.randomUUID(), kind: "unassigned", amount: 0, observedAt: rows[0]?.observedAt ?? new Date().toISOString() }])}>Add portion</Button>
            <p className={Math.abs(draftTotal - total) > 0.005 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>Parts must total {formatCurrency(total, currencySymbol)}. Current: {formatCurrency(draftTotal, currencySymbol)}.</p>
            <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditingSnapshotId(null)}>Cancel</Button><Button type="button" size="sm" disabled={saving || Math.abs(draftTotal - total) > 0.005 || draftRows.some((row) => row.amount <= 0)} onClick={() => save(snapshot.id)}>{saving ? "Saving…" : "Save allocation"}</Button></div>
          </>}
        </div>;
      })}
    </section>
  );
}
