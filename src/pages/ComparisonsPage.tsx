import { useOutletContext } from "react-router-dom";
import StatCard from "@/components/StatCard";
import DiffValue from "@/components/DiffValue";
import {
  weekTotal,
  formatCurrency,
  getPreviousWeek,
  getRecordWeek,
  getActiveEnteredDays,
  samePointTotal,
  samePointAppTotal,
  dayTotal,
} from "@/lib/store";
import type { StoreContext } from "./types";

export default function ComparisonsPage() {
  const { openWeek, weeks, settings } = useOutletContext<StoreContext>();
  const sym = settings.currencySymbol;

  if (!openWeek) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No open week to compare.</p>
      </div>
    );
  }

  const total = weekTotal(openWeek);
  const prev = getPreviousWeek(weeks, openWeek);
  const record = getRecordWeek(weeks, openWeek);
  const activeDays = getActiveEnteredDays(openWeek);
  const prevSP = prev ? samePointTotal(prev, activeDays) : 0;
  const recSP = record ? samePointTotal(record, activeDays) : 0;
  const recFull = record ? weekTotal(record) : 0;
  const diffPrev = prev ? total - prevSP : 0;
  const diffRec = record ? total - recSP : 0;
  const pctPrev = prevSP > 0 ? (diffPrev / prevSP) * 100 : 0;
  const pctRec = recSP > 0 ? (diffRec / recSP) * 100 : 0;
  const needToBeat = Math.max(0, recFull + 0.01 - total);
  const apps = settings.activeApps;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Comparisons</h1>
      <p className="text-sm text-muted-foreground">
        Same-point comparison ({activeDays.length} day{activeDays.length !== 1 ? "s" : ""} entered)
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Current Total" value={formatCurrency(total, sym)} variant="primary" />
        <StatCard
          label="vs Previous"
          value={prev ? formatCurrency(diffPrev, sym) : "—"}
          variant={diffPrev > 0 ? "success" : diffPrev < 0 ? "warning" : "default"}
          sub={prev ? `${pctPrev > 0 ? "+" : ""}${pctPrev.toFixed(1)}%` : "No data"}
        />
        <StatCard
          label="vs Record"
          value={record ? formatCurrency(diffRec, sym) : "—"}
          variant={diffRec > 0 ? "gold" : diffRec < 0 ? "warning" : "default"}
          sub={record ? `${pctRec > 0 ? "+" : ""}${pctRec.toFixed(1)}%` : "No data"}
        />
        <StatCard
          label="To Beat Record"
          value={record ? formatCurrency(needToBeat, sym) : "—"}
          variant="gold"
        />
      </div>

      {/* Day comparison */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Day</th>
              <th className="text-right px-3 py-2 font-semibold text-primary">Current</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Previous</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Diff</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Record</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Diff</th>
            </tr>
          </thead>
          <tbody>
            {openWeek.entries.map((day, i) => {
              const cur = dayTotal(day);
              const pv = prev ? dayTotal(prev.entries[i]) : 0;
              const rc = record ? dayTotal(record.entries[i]) : 0;
              return (
                <tr key={day.dayName} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{day.dayName.slice(0, 3)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(cur, sym)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {prev ? formatCurrency(pv, sym) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {prev ? <DiffValue value={cur - pv} symbol={sym} /> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {record ? formatCurrency(rc, sym) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {record ? <DiffValue value={cur - rc} symbol={sym} /> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* App comparison */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">App</th>
              <th className="text-right px-3 py-2 font-semibold text-primary">Current</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Previous</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Diff</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Record</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Diff</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const cur = samePointAppTotal(openWeek, app, activeDays);
              const pv = prev ? samePointAppTotal(prev, app, activeDays) : 0;
              const rc = record ? samePointAppTotal(record, app, activeDays) : 0;
              return (
                <tr key={app} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{app}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(cur, sym)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {prev ? formatCurrency(pv, sym) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {prev ? <DiffValue value={cur - pv} symbol={sym} /> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {record ? formatCurrency(rc, sym) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {record ? <DiffValue value={cur - rc} symbol={sym} /> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}