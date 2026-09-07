import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/store";
import type { EarningsSnapshot, ManualRideAllocation, ManualRideAllocationDraft, RideEvent, WeekRecord } from "@/lib/types";

type DraftRow = ManualRideAllocationDraft & { key: string };

function toDraft(row: ManualRideAllocation): DraftRow {
  return { key: row.id, rideEventId: row.rideEventId ?? null, kind: row.kind, amount: row.amount, note: row.note };
}

export default function ManualRideAllocationLedger({ week, rides, snapshots, allocations, currencySymbol, onReplace }: {
  week: WeekRecord;
  rides: RideEvent[];
  snapshots: EarningsSnapshot[];
  allocations: ManualRideAllocation[];
  currencySymbol: string;
  onReplace: (draft: { weekId: string; dayDate: string; app: string; sourceTotal: number }, rows: ManualRideAllocationDraft[]) => Promise<boolean>;
}) {
  const items = useMemo(() => {
    const liveRideScopes = new Set(rides.filter((ride) => ride.weekId === week.id && ride.source === "foreground_browser" && ride.status !== "active" && ride.status !== "cancelled" && ride.app).map((ride) => `${ride.dayDate}|${ride.app}`));
    const snapshotScopes = new Set(snapshots.filter((snapshot) => snapshot.weekId === week.id && Number(snapshot.delta) > 0).map((snapshot) => `${snapshot.dayDate}|${snapshot.app}`));
    const rowsByScope = new Map<string, ManualRideAllocation[]>();
    allocations.filter((row) => row.isCurrent && row.weekId === week.id).forEach((row) => {
      const key = `${row.dayDate}|${row.app}`;
      rowsByScope.set(key, [...(rowsByScope.get(key) ?? []), row]);
    });
    return week.entries.flatMap((day) => Object.entries(day.apps)
      .filter(([, amount]) => Number(amount) > 0)
      .filter(([app]) => !snapshotScopes.has(`${day.date}|${app}`) && liveRideScopes.has(`${day.date}|${app}`))
      .map(([app, amount]) => ({ day, app, total: Number(amount), rows: rowsByScope.get(`${day.date}|${app}`) ?? [] })))
      .sort((a, b) => b.day.date.localeCompare(a.day.date) || a.app.localeCompare(b.app));
  }, [allocations, rides, snapshots, week]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  if (!items.length) return null;

  function beginEdit(item: typeof items[number]) {
    setEditingKey(`${item.day.date}|${item.app}`);
    setDraftRows(item.rows.length ? item.rows.map(toDraft) : [{ key: crypto.randomUUID(), rideEventId: null, kind: "unassigned", amount: item.total, note: "Not yet assigned to a specific live ride." }]);
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setDraftRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  async function save(item: typeof items[number]) {
    const rows = draftRows.map(({ key: _key, ...row }) => row).filter((row) => row.amount > 0);
    if (!rows.length) return;
    setSaving(true);
    try {
      if (await onReplace({ weekId: week.id, dayDate: item.day.date, app: item.app, sourceTotal: item.total }, rows)) setEditingKey(null);
    } finally {
      setSaving(false);
    }
  }

  return <section className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3 space-y-3">
    <div>
      <p className="text-sm font-semibold">Ride allocation review</p>
      <p className="text-xs text-muted-foreground">Distribute a reported daily total only across rides actually captured live that day. This never creates a historical ride or changes the reported total.</p>
    </div>
    <div className="rounded-lg border border-primary/20 bg-background/70 p-2.5 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Evidence boundary:</span> only foreground-captured rides can receive a portion. Any unknown balance remains visible instead of being guessed.</div>
    {items.map((item) => {
      const key = `${item.day.date}|${item.app}`;
      const editing = editingKey === key;
      const assigned = item.rows.filter((row) => row.rideEventId).reduce((sum, row) => sum + row.amount, 0);
      const remaining = Math.max(0, item.total - assigned);
      const draftTotal = draftRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      const rideChoices = rides.filter((ride) => ride.weekId === week.id && ride.dayDate === item.day.date && ride.app === item.app && ride.source === "foreground_browser" && ride.status !== "active" && ride.status !== "cancelled");
      return <div key={key} className="rounded-lg border border-border bg-background/65 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold">{item.app} · {item.day.dayName} · reported {formatCurrency(item.total, currencySymbol)}</p><p className="text-xs text-muted-foreground">Ride-assigned {formatCurrency(assigned, currencySymbol)} · Remaining {formatCurrency(remaining, currencySymbol)}</p></div>
          {!editing && <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(item)}>{item.rows.length ? "Review" : "Assign live rides"}</Button>}
        </div>
        {!editing ? item.rows.map((row) => {
          const ride = row.rideEventId ? rides.find((candidate) => candidate.id === row.rideEventId) : null;
          return <p key={row.id} className="text-xs text-muted-foreground">{formatCurrency(row.amount, currencySymbol)} · {ride ? `${ride.app ?? "Ride"} · ${new Date(ride.endedAt ?? ride.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Unassigned for review"}</p>;
        }) : <>
          {draftRows.map((row) => <div key={row.key} className="grid grid-cols-[1fr_92px_auto] gap-2">
            <select className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={row.rideEventId ?? "unassigned"} onChange={(event) => {
              const rideEventId = event.target.value === "unassigned" ? null : event.target.value;
              updateRow(row.key, { rideEventId, kind: rideEventId ? "ride_base" : "unassigned" });
            }}><option value="unassigned">Unassigned / pending</option>{rideChoices.map((ride) => <option key={ride.id} value={ride.id}>{ride.app} · {new Date(ride.endedAt ?? ride.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}</select>
            <Input type="number" min="0" step="0.01" className="h-10 text-right font-mono" value={row.amount} onChange={(event) => updateRow(row.key, { amount: Math.max(0, Number(event.target.value) || 0) })} />
            <Button type="button" size="sm" variant="ghost" className="h-10 px-2" onClick={() => setDraftRows((rows) => rows.filter((item) => item.key !== row.key))}>Remove</Button>
          </div>)}
          <Button type="button" size="sm" variant="secondary" onClick={() => setDraftRows((rows) => [...rows, { key: crypto.randomUUID(), rideEventId: null, kind: "unassigned", amount: 0 }])}>Add portion</Button>
          <p className={Math.abs(draftTotal - item.total) > 0.005 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>Parts must total {formatCurrency(item.total, currencySymbol)}. Current: {formatCurrency(draftTotal, currencySymbol)}.</p>
          <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditingKey(null)}>Cancel</Button><Button type="button" size="sm" disabled={saving || Math.abs(draftTotal - item.total) > 0.005 || draftRows.some((row) => row.amount <= 0)} onClick={() => save(item)}>{saving ? "Saving…" : "Save allocation"}</Button></div>
        </>}
      </div>;
    })}
  </section>;
}
