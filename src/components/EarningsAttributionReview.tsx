import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildAttributionReviewItems } from "@/lib/earningsAttributions";
import { formatCurrency } from "@/lib/store";
import type { EarningsAttribution, EarningsAttributionIntent, EarningsSnapshot, ShiftSession, WeekRecord } from "@/lib/types";

interface Props {
  weeks: WeekRecord[];
  snapshots: EarningsSnapshot[];
  attributions: EarningsAttribution[];
  currencySymbol: string;
  onSave: (snapshotId: string, intent: Omit<EarningsAttributionIntent, "dayDate" | "app" | "previousAmount" | "newAmount">) => Promise<boolean>;
}

type ShiftOption = { dayDate: string; dayName: string; shift: ShiftSession & { endTime: string } };

function reasonLabel(reason: ReturnType<typeof buildAttributionReviewItems>[number]["reason"]): string {
  if (reason === "after_shift") return "Observed after the last shift";
  if (reason === "different_day") return "Captured on a different calendar day";
  if (reason === "historical_edit") return "Historical edit without a shift target";
  if (reason === "outside_shift") return "Observed outside worked time";
  return "Needs attribution";
}

export default function EarningsAttributionReview({ weeks, snapshots, attributions, currencySymbol, onSave }: Props) {
  const items = useMemo(() => buildAttributionReviewItems({ weeks, snapshots, attributions }), [attributions, snapshots, weeks]);
  const shiftOptions = useMemo<ShiftOption[]>(() => weeks.flatMap((week) => week.entries.flatMap((day) =>
    (day.shifts ?? []).filter((shift): shift is ShiftSession & { endTime: string } => Boolean(shift.endTime)).map((shift) => ({ dayDate: day.date, dayName: day.dayName, shift })),
  )).sort((a, b) => b.shift.endTime.localeCompare(a.shift.endTime)), [weeks]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Record<string, string>>({});
  const [exactAt, setExactAt] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);

  async function saveShift(snapshotId: string, option: ShiftOption, source: "user" | "retroactive" = "user") {
    setWorking(snapshotId);
    await onSave(snapshotId, {
      status: "resolved",
      mode: "shift_distributed",
      attributedDayDate: option.dayDate,
      shiftId: option.shift.id,
      effectiveStartAt: option.shift.startTime,
      effectiveEndAt: option.shift.endTime,
      source,
      confidence: "estimated",
      note: "Assigned to a shift and distributed across its worked blocks.",
    });
    setWorking(null);
  }

  async function saveExact(snapshotId: string, option: ShiftOption, value: string) {
    const exact = new Date(value);
    if (Number.isNaN(exact.getTime())) return;
    setWorking(snapshotId);
    await onSave(snapshotId, {
      status: "resolved",
      mode: "exact",
      attributedDayDate: option.dayDate,
      shiftId: option.shift.id,
      effectiveStartAt: exact.toISOString(),
      effectiveEndAt: exact.toISOString(),
      source: "user",
      confidence: "confirmed",
      note: "Exact earning time confirmed during attribution review.",
    });
    setWorking(null);
  }

  async function exclude(snapshotId: string) {
    setWorking(snapshotId);
    await onSave(snapshotId, {
      status: "excluded",
      mode: "unassigned",
      source: "user",
      confidence: "unassigned",
      note: "Kept in reported earnings and intentionally excluded from operational timing.",
    });
    setWorking(null);
  }

  async function resolveSuggested() {
    const suggested = items.filter((item) => item.suggestedShiftId);
    if (!suggested.length) return;
    if (!window.confirm(`Distribute ${suggested.length} suggested earning event${suggested.length === 1 ? "" : "s"} across their only completed shift? Original totals and snapshots will not change.`)) return;
    setWorking("bulk");
    for (const item of suggested) {
      const option = shiftOptions.find((candidate) => candidate.shift.id === item.suggestedShiftId);
      if (option) await saveShift(item.snapshot.id, option, "retroactive");
    }
    setWorking(null);
  }

  const suggestedCount = items.filter((item) => item.suggestedShiftId).length;
  const pendingAmount = items.reduce((sum, item) => sum + Math.max(0, Number(item.snapshot.delta) || 0), 0);

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h3 className="font-bold flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-500" /> Earnings Attribution</h3>
          <p className="text-xs text-muted-foreground">Observed time and earned time are separate. Pending events stay in reported totals but out of hourly rankings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {items.length} pending · {formatCurrency(pendingAmount, currencySymbol)}
          </span>
          {suggestedCount > 0 && <Button size="sm" variant="outline" disabled={working === "bulk"} onClick={resolveSuggested}>Resolve {suggestedCount} suggested</Button>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Every eligible earnings event has safe operational timing.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const selectedId = selectedShift[item.snapshot.id] ?? item.suggestedShiftId ?? "";
            const option = shiftOptions.find((candidate) => candidate.shift.id === selectedId);
            const exactValue = exactAt[item.snapshot.id] ?? "";
            const exactDate = exactValue ? new Date(exactValue) : null;
            const exactValid = Boolean(option && exactDate && !Number.isNaN(exactDate.getTime())
              && exactDate.getTime() >= Date.parse(option.shift.startTime)
              && exactDate.getTime() <= Date.parse(option.shift.endTime));
            return (
              <div key={item.snapshot.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.snapshot.app} · +{formatCurrency(item.snapshot.delta, currencySymbol)}</p>
                    <p className="text-xs text-muted-foreground">{reasonLabel(item.reason)} · entered {new Date(item.snapshot.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.suggestedShiftId && (
                      <Button size="sm" disabled={working === item.snapshot.id} onClick={() => {
                        const suggested = shiftOptions.find((candidate) => candidate.shift.id === item.suggestedShiftId);
                        if (suggested) void saveShift(item.snapshot.id, suggested);
                      }}><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Use only shift</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === item.snapshot.id ? null : item.snapshot.id)}>Choose details</Button>
                    <Button size="sm" variant="ghost" disabled={working === item.snapshot.id} onClick={() => void exclude(item.snapshot.id)}>Keep out of hourly</Button>
                  </div>
                </div>
                {expanded === item.snapshot.id && (
                  <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
                    <Select value={selectedId} onValueChange={(value) => setSelectedShift((current) => ({ ...current, [item.snapshot.id]: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select original shift" /></SelectTrigger>
                      <SelectContent>
                        {shiftOptions.map((candidate) => <SelectItem key={candidate.shift.id} value={candidate.shift.id}>{candidate.dayDate} · {candidate.dayName} · {new Date(candidate.shift.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–{new Date(candidate.shift.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
                      <Input type="datetime-local" value={exactValue} onChange={(event) => setExactAt((current) => ({ ...current, [item.snapshot.id]: event.target.value }))} />
                      <Button variant="outline" disabled={!option || working === item.snapshot.id} onClick={() => option && void saveShift(item.snapshot.id, option)}>Spread across shift</Button>
                      <Button disabled={!option || !exactValid || working === item.snapshot.id} onClick={() => option && void saveExact(item.snapshot.id, option, exactValue)}>Use exact time</Button>
                    </div>
                    {exactValue && !exactValid && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Exact time must fall inside the selected shift.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
